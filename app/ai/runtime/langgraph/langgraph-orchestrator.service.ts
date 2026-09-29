import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { AgentDefinition } from '../../agent/agent.interface';
import { AgentScannerService } from '../../agent/agent-scanner.service';
import { GuardrailService } from '../../guardrail/guardrail.service';
import {
  AgentStreamEvent,
  ExecuteError,
  LlmMessage,
  RunResult,
  Step,
} from '../../contracts';
import { CheckpointService } from '../../memory/checkpoint.service';
import { ThreadService } from '../../memory/thread.service';
import { ExecutorService } from '../../tool/executor.service';
import { ThreadCheckpoint } from '../../store/store.interface';
import { TraceService } from '../../trace/trace.service';
import {
  delegationContext,
  runWithDelegationContext,
  StepEmitter,
} from '../delegation/delegation.context';
import { LangChainPlannerService } from '../langchain/langchain-planner.service';
import {
  resolveMaxDelegationDepth,
  resolveMaxIterations,
  resolveRecursionLimit,
} from '../internal/load-runtime-config';
import { AgentGraphHooks, buildAgentGraph } from './agent.graph';
import { AgentGraphState } from './agent.state';

interface RunContext {
  agent: AgentDefinition;
  skillNames: Set<string>;
  toolNames: Set<string>;
  messages: LlmMessage[];
  userContent: string;
}

const MAX_ITER_OUTPUT = 'Reached maximum iterations without a final answer.';

@Injectable()
export class LangGraphOrchestratorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly agentScannerService: AgentScannerService,
    private readonly plannerService: LangChainPlannerService,
    private readonly executorService: ExecutorService,
    private readonly guardrailService: GuardrailService,
    private readonly traceService: TraceService,
    private readonly threadService: ThreadService,
    private readonly checkpointService: CheckpointService,
  ) {}

  async run(agentName: string, input: unknown, threadId?: string): Promise<RunResult> {
    const resolvedThreadId = this.threadService.ensureThread(threadId);
    const userContent =
      typeof input === 'string' ? input : JSON.stringify(input ?? {});

    const guardrailResult = this.guardrailService.check(userContent);
    const runId = this.traceService.createRun({ agentName, input });
    const steps: Step[] = [];

    if (!guardrailResult.safe) {
      return this.buildBlockedResult(
        runId,
        steps,
        guardrailResult.reason,
        resolvedThreadId,
      );
    }

    const checkpoint = await this.checkpointService.load(resolvedThreadId);
    const context = this.buildContext(agentName, input, checkpoint);
    const result = await runWithDelegationContext(
      {
        runId,
        agentName,
        agentStack: [agentName],
        depth: 0,
        parentSteps: steps,
        iteration: 0,
      },
      () => this.runGraph(runId, context, steps),
    );

    this.traceService.finalize(runId, result.output);
    await this.persistTurn(resolvedThreadId, checkpoint, context.userContent, result.output);

    return { ...result, threadId: resolvedThreadId };
  }

  async *streamRun(
    agentName: string,
    input: unknown,
    threadId?: string,
  ): AsyncGenerator<AgentStreamEvent> {
    const resolvedThreadId = this.threadService.ensureThread(threadId);
    const userContent =
      typeof input === 'string' ? input : JSON.stringify(input ?? {});

    const guardrailResult = this.guardrailService.check(userContent);
    const runId = this.traceService.createRun({ agentName, input });
    const steps: Step[] = [];

    if (!guardrailResult.safe) {
      const blocked = this.buildBlockedResult(
        runId,
        steps,
        guardrailResult.reason,
        resolvedThreadId,
      );
      yield { event: 'step', data: blocked.steps[0]! };
      yield { event: 'done', data: blocked };
      return;
    }

    const checkpoint = await this.checkpointService.load(resolvedThreadId);
    const context = this.buildContext(agentName, input, checkpoint);

    const result = yield* this.runGraphStream(runId, context, steps);

    this.traceService.finalize(runId, result.output);
    await this.persistTurn(resolvedThreadId, checkpoint, context.userContent, result.output);

    yield { event: 'done', data: { ...result, threadId: resolvedThreadId } };
  }

  async invokeDelegatedAgent(
    targetAgent: string,
    input: string,
  ): Promise<{ runId: string; output: string } | { ok: false; error: ExecuteError }> {
    const parent = delegationContext.getStore();
    if (!parent) {
      return {
        ok: false,
        error: {
          code: 'NO_DELEGATION_CONTEXT',
          message: 'invoke_agent is only available during an agent run',
        },
      };
    }

    const maxDepth = resolveMaxDelegationDepth(this.configService);
    if (parent.depth >= maxDepth) {
      return {
        ok: false,
        error: {
          code: 'DELEGATION_DEPTH_EXCEEDED',
          message: `delegation depth exceeded (max ${maxDepth})`,
        },
      };
    }

    if (targetAgent === parent.agentName || parent.agentStack.includes(targetAgent)) {
      return {
        ok: false,
        error: {
          code: 'DELEGATION_CYCLE',
          message: `agent "${targetAgent}" is already on the delegation stack`,
        },
      };
    }

    const agent = this.agentScannerService.get(targetAgent);
    if (!agent) {
      return {
        ok: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `agent not found: ${targetAgent}`,
        },
      };
    }

    const guardrailResult = this.guardrailService.check(input);
    if (!guardrailResult.safe) {
      return {
        ok: false,
        error: {
          code: 'GUARDRAIL_BLOCKED',
          message: guardrailResult.reason ?? 'Request blocked by guardrail.',
        },
      };
    }

    const childRunId = this.traceService.createRun({ agentName: targetAgent, input });
    const startedAt = Date.now();
    const delegationStep: Step = {
      type: 'delegation',
      iteration: parent.iteration,
      agent: targetAgent,
      childRunId,
      status: 'running',
      startedAt,
      steps: [],
    };

    parent.parentSteps.push(delegationStep);
    this.traceService.addStep(parent.runId, delegationStep);
    parent.emit?.({ event: 'step', data: delegationStep });

    const childSteps = delegationStep.steps!;
    const childContext = this.buildContext(targetAgent, input, null);

    const forwardChildStep: StepEmitter | undefined = parent.emit
      ? (event) => {
          if (event.event !== 'step') {
            return;
          }
          parent.emit?.({
            event: 'step',
            data: {
              ...event.data,
              agent: targetAgent,
              parentRunId: parent.runId,
            },
          });
        }
      : undefined;

    const childResult = await runWithDelegationContext(
      {
        runId: childRunId,
        agentName: targetAgent,
        agentStack: [...parent.agentStack, targetAgent],
        depth: parent.depth + 1,
        parentSteps: parent.parentSteps,
        iteration: 0,
        emit: parent.emit,
      },
      () => this.runGraph(childRunId, childContext, childSteps, forwardChildStep),
    );

    delegationStep.status = 'done';
    delegationStep.endedAt = Date.now();
    parent.emit?.({ event: 'step', data: { ...delegationStep } });

    this.traceService.finalize(childRunId, childResult.output);

    return {
      runId: childRunId,
      output: childResult.output,
    };
  }

  private async runGraph(
    runId: string,
    context: RunContext,
    steps: Step[],
    forwardEmit?: StepEmitter,
  ): Promise<Omit<RunResult, 'threadId'>> {
    const maxIterations = resolveMaxIterations(this.configService);
    const recursionLimit = resolveRecursionLimit(this.configService);
    const hooks = this.createHooks(steps, runId, forwardEmit);

    const graph = buildAgentGraph({
      planner: this.plannerService,
      executor: this.executorService,
      maxIterations,
      skillNames: context.skillNames,
      toolNames: context.toolNames,
      model: context.agent.model,
      hooks,
    });

    const initialState: AgentGraphState = {
      messages: context.messages,
      iteration: 0,
      planResult: null,
      executeResult: null,
      executeBatch: null,
      observation: null,
      output: null,
      done: false,
    };

    const finalState = await graph.invoke(initialState, { recursionLimit });
    const output = this.resolveGraphOutput(finalState, steps);

    return {
      runId,
      output,
      steps,
    };
  }

  private async *runGraphStream(
    runId: string,
    context: RunContext,
    steps: Step[],
  ): AsyncGenerator<AgentStreamEvent, Omit<RunResult, 'threadId'>> {
    const maxIterations = resolveMaxIterations(this.configService);
    const recursionLimit = resolveRecursionLimit(this.configService);
    const pending: AgentStreamEvent[] = [];
    const previous = delegationContext.getStore();
    let wake: (() => void) | undefined;

    const pulse = (): void => {
      const notify = wake;
      wake = undefined;
      notify?.();
    };

    const emit: StepEmitter = (event) => {
      pending.push(event);
      previous?.emit?.(event);
      pulse();
    };

    delegationContext.enterWith({
      runId,
      agentName: context.agent.name,
      agentStack: previous?.agentStack ?? [context.agent.name],
      depth: previous?.depth ?? 0,
      parentSteps: previous?.parentSteps ?? steps,
      iteration: previous?.iteration ?? 0,
      emit,
    });

    const hooks = this.createHooks(steps, runId, emit);

    const graph = buildAgentGraph({
      planner: this.plannerService,
      executor: this.executorService,
      maxIterations,
      skillNames: context.skillNames,
      toolNames: context.toolNames,
      model: context.agent.model,
      hooks,
    });

    const initialState: AgentGraphState = {
      messages: context.messages,
      iteration: 0,
      planResult: null,
      executeResult: null,
      executeBatch: null,
      observation: null,
      output: null,
      done: false,
    };

    let finalState: AgentGraphState = initialState;
    let graphDone = false;
    let graphError: unknown;

    const graphTask = (async (): Promise<void> => {
      try {
        const stream = await graph.stream(initialState, {
          streamMode: 'updates',
          recursionLimit,
        });

        for await (const chunk of stream) {
          const update = Object.values(chunk)[0] as Partial<AgentGraphState> | undefined;
          if (update) {
            finalState = { ...finalState, ...update };
          }
          pulse();
        }
      } catch (error) {
        graphError = error;
      } finally {
        graphDone = true;
        pulse();
      }
    })();

    while (!graphDone || pending.length > 0) {
      while (pending.length > 0) {
        yield pending.shift()!;
      }

      if (graphDone) {
        break;
      }

      await new Promise<void>((resolve) => {
        if (pending.length > 0 || graphDone) {
          resolve();
          return;
        }
        wake = resolve;
      });
    }

    await graphTask;

    if (graphError) {
      throw graphError;
    }

    const output = this.resolveGraphOutput(finalState, steps);

    return {
      runId,
      output,
      steps,
    };
  }

  private createHooks(
    steps: Step[],
    runId: string,
    emit?: StepEmitter,
  ): AgentGraphHooks {
    return {
      onPlanStep: (partial) => {
        this.syncDelegationIteration(partial.iteration);
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'step', data: step });
      },
      onExecuteStep: (partial) => {
        this.syncDelegationIteration(partial.iteration);
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'step', data: step });
      },
      onObserveStep: (partial) => {
        this.syncDelegationIteration(partial.iteration);
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'step', data: step });
      },
      onFinalStep: (partial) => {
        this.syncDelegationIteration(partial.iteration);
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'delta', data: { content: partial.output as string } });
        emit?.({ event: 'step', data: step });
      },
    };
  }

  private syncDelegationIteration(iteration: number): void {
    const context = delegationContext.getStore();
    if (context) {
      context.iteration = iteration;
    }
  }

  private resolveGraphOutput(finalState: AgentGraphState, steps: Step[]): string {
    const candidates = [
      finalState.output,
      finalState.planResult?.action.output,
      finalState.planResult?.response.content,
    ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');

    for (const candidate of candidates) {
      if (candidate !== MAX_ITER_OUTPUT) {
        return candidate;
      }
    }

    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const step = steps[index]!;
      if (
        step.type === 'final' &&
        typeof step.output === 'string' &&
        step.output.trim() !== '' &&
        step.output !== MAX_ITER_OUTPUT
      ) {
        return step.output;
      }
    }

    return candidates[0] ?? MAX_ITER_OUTPUT;
  }

  private buildContext(
    agentName: string,
    input: unknown,
    checkpoint: ThreadCheckpoint | null,
  ): RunContext {
    const agent = this.agentScannerService.get(agentName);
    if (!agent) {
      throw new Error(`agent not found: ${agentName}`);
    }

    const skillNames = new Set(agent.skills);
    const toolNames = new Set(agent.tools);
    const userContent =
      typeof input === 'string' ? input : JSON.stringify(input ?? {});

    const historyCheckpoint = checkpoint
      ? { ...checkpoint, messages: this.threadService.truncate(checkpoint.messages) }
      : null;
    const historyMessages = this.threadService.buildContextMessages(historyCheckpoint);

    const messages: LlmMessage[] = [
      { role: 'system', content: agent.prompt ?? '' },
      ...historyMessages,
      { role: 'user', content: userContent },
    ];

    return {
      agent,
      skillNames,
      toolNames,
      messages,
      userContent,
    };
  }

  private async persistTurn(
    threadId: string,
    checkpoint: ThreadCheckpoint | null,
    userContent: string,
    output: string,
  ): Promise<void> {
    const baseCheckpoint = checkpoint ?? {
      threadId,
      messages: [],
      updatedAt: Date.now(),
    };
    const updated = this.threadService.appendTurn(baseCheckpoint, userContent, output);
    await this.checkpointService.save({
      ...updated,
      messages: this.threadService.truncate(updated.messages),
    });
  }

  private buildBlockedResult(
    runId: string,
    steps: Step[],
    reason: string | undefined,
    threadId: string,
  ): RunResult {
    const guardStep = this.recordStep(steps, runId, {
      type: 'guardrail',
      iteration: 0,
      reason,
    });
    const output = reason ?? 'Request blocked by guardrail.';
    this.traceService.finalize(runId, output);

    return {
      runId,
      output,
      steps: [guardStep],
      threadId,
    };
  }

  private recordStep(steps: Step[], runId: string, step: Step): Step {
    const now = Date.now();
    const recorded: Step = {
      ...step,
      startedAt: typeof step.startedAt === 'number' ? step.startedAt : now,
      endedAt: now,
    };
    steps.push(recorded);
    this.traceService.addStep(runId, recorded);
    return recorded;
  }
}
