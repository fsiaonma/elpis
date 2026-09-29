import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { AgentDefinition } from '../../agent/agent.interface';
import { AgentScannerService } from '../../agent/agent-scanner.service';
import { GuardrailService } from '../../guardrail/guardrail.service';
import {
  AgentStreamEvent,
  LlmMessage,
  RunResult,
  Step,
} from '../../contracts';
import { CheckpointService } from '../../memory/checkpoint.service';
import { ThreadService } from '../../memory/thread.service';
import { ExecutorService } from '../../tool/executor.service';
import { ThreadCheckpoint } from '../../store/store.interface';
import { TraceService } from '../../trace/trace.service';
import { LangChainPlannerService } from '../langchain/langchain-planner.service';
import { resolveMaxIterations } from '../internal/load-runtime-config';
import { AgentGraphHooks, buildAgentGraph } from './agent.graph';
import { AgentGraphState } from './agent.state';

interface RunContext {
  agent: AgentDefinition;
  skillNames: Set<string>;
  toolNames: Set<string>;
  messages: LlmMessage[];
  userContent: string;
}

type StepEmitter = (event: AgentStreamEvent) => void;

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
    const result = await this.runGraph(runId, context, steps);

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

  private async runGraph(
    runId: string,
    context: RunContext,
    steps: Step[],
    emit?: StepEmitter,
  ): Promise<Omit<RunResult, 'threadId'>> {
    const maxIterations = resolveMaxIterations(this.configService);
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
      observation: null,
      output: null,
      done: false,
    };

    const finalState = await graph.invoke(initialState);
    const output =
      finalState.output ??
      finalState.planResult?.action.output ??
      finalState.planResult?.response.content ??
      'Reached maximum iterations without a final answer.';

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
    const pending: AgentStreamEvent[] = [];
    const emit: StepEmitter = (event) => {
      pending.push(event);
    };
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
      observation: null,
      output: null,
      done: false,
    };

    let finalState: AgentGraphState = initialState;
    const stream = await graph.stream(initialState, { streamMode: 'updates' });

    for await (const chunk of stream) {
      const update = Object.values(chunk)[0] as Partial<AgentGraphState> | undefined;
      if (update) {
        finalState = { ...finalState, ...update };
      }

      while (pending.length > 0) {
        yield pending.shift()!;
      }
    }

    while (pending.length > 0) {
      yield pending.shift()!;
    }

    const output =
      finalState.output ??
      finalState.planResult?.action.output ??
      finalState.planResult?.response.content ??
      'Reached maximum iterations without a final answer.';

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
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'step', data: step });
      },
      onExecuteStep: (partial) => {
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'step', data: step });
      },
      onObserveStep: (partial) => {
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'step', data: step });
      },
      onFinalStep: (partial) => {
        const step = this.recordStep(steps, runId, partial);
        emit?.({ event: 'delta', data: { content: partial.output as string } });
        emit?.({ event: 'step', data: step });
      },
    };
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
    steps.push(step);
    this.traceService.addStep(runId, step);
    return step;
  }
}
