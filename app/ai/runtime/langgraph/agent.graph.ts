import { END, START, StateGraph } from '@langchain/langgraph';
import {
  ExecuteResult,
  LlmMessage,
  PlanAction,
  PlanActionType,
  Step,
} from '../../contracts';
import { ExecutorService } from '../../tool/executor.service';
import { LangChainPlannerService } from '../langchain/langchain-planner.service';
import { AgentGraphAnnotation, AgentGraphState } from './agent.state';
import { observeToolResult } from './compact-tool-result';

export interface AgentGraphDefinition {
  nodes: string[];
  edges: Array<{ from: string; to: string; when?: string }>;
}

export interface AgentGraphHooks {
  onPlanStep: (step: Omit<Step, 'type' | 'iteration'> & { type: 'plan'; iteration: number }) => void;
  onExecuteStep: (
    step: Omit<Step, 'type' | 'iteration'> & { type: 'skill' | 'tool'; iteration: number },
  ) => void;
  onObserveStep: (
    step: Omit<Step, 'type' | 'iteration'> & { type: 'observe'; iteration: number },
  ) => void;
  onFinalStep: (
    step: Omit<Step, 'type' | 'iteration'> & { type: 'final'; iteration: number },
  ) => void;
}

export interface BuildAgentGraphOptions {
  planner: LangChainPlannerService;
  executor: ExecutorService;
  maxIterations: number;
  skillNames: Set<string>;
  toolNames: Set<string>;
  model?: string;
  hooks: AgentGraphHooks;
}

const MAX_ITER_OUTPUT = 'Reached maximum iterations without a final answer.';

export function describeAgentGraph(): AgentGraphDefinition {
  return {
    nodes: ['plan', 'execute', 'observe'],
    edges: [
      { from: '__start__', to: 'plan' },
      { from: 'plan', to: 'execute', when: 'tool_call' },
      { from: 'plan', to: '__end__', when: 'final' },
      { from: 'execute', to: 'observe' },
      { from: 'observe', to: 'plan', when: 'continue' },
      { from: 'observe', to: '__end__', when: 'max_iterations' },
    ],
  };
}

export function buildAgentGraph(options: BuildAgentGraphOptions) {
  const graph = new StateGraph(AgentGraphAnnotation)
    .addNode('plan', async (state) => planNode(state, options))
    .addNode('execute', async (state) => executeNode(state, options))
    .addNode('observe', async (state) => observeNode(state, options))
    .addEdge(START, 'plan')
    .addConditionalEdges('plan', (state) => (state.done ? END : 'execute'))
    .addEdge('execute', 'observe')
    .addConditionalEdges('observe', (state) => (state.done ? END : 'plan'));

  return graph.compile();
}

function resolveMaxIterationOutput(state: AgentGraphState): string {
  if (
    typeof state.output === 'string' &&
    state.output.trim() &&
    state.output !== MAX_ITER_OUTPUT
  ) {
    return state.output;
  }
  return MAX_ITER_OUTPUT;
}

async function planNode(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): Promise<Partial<AgentGraphState>> {
  const iteration = state.iteration + 1;

  if (iteration > options.maxIterations && !state.done) {
    const output = resolveMaxIterationOutput(state);
    options.hooks.onFinalStep({
      type: 'final',
      iteration,
      output,
      node: 'plan',
    });

    return {
      iteration,
      output,
      done: true,
    };
  }

  const planResult = await options.planner.plan(state.messages, {
    skillNames: options.skillNames,
    toolNames: options.toolNames,
    model: options.model,
  });

  options.hooks.onPlanStep({
    type: 'plan',
    iteration,
    action: planResult.action,
    planner: 'langchain',
    node: 'plan',
  });

  const messages = [...state.messages, planResult.response];

  if (planResult.action.type === 'final') {
    const output = planResult.action.output ?? planResult.response.content ?? '';
    options.hooks.onFinalStep({
      type: 'final',
      iteration,
      output,
      node: 'plan',
    });

    return {
      messages,
      iteration,
      planResult,
      output,
      done: true,
      executeBatch: null,
      executeResult: null,
    };
  }

  return {
    messages,
    iteration,
    planResult,
    executeResult: null,
    executeBatch: null,
    observation: null,
    done: false,
  };
}

async function executeNode(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): Promise<Partial<AgentGraphState>> {
  const toolCalls = collectToolCalls(state, options);
  if (toolCalls.length === 0) {
    return {};
  }

  if (toolCalls.length === 1) {
    const call = toolCalls[0]!;
    const executeResult = await options.executor.execute(call.action, {
      skillNames: options.skillNames,
      toolNames: options.toolNames,
    });
    recordExecuteStep(options, state.iteration, call.action, executeResult);

    return {
      executeResult,
      executeBatch: null,
    };
  }

  const executeBatch = await Promise.all(
    toolCalls.map(async (call) => {
      const executeResult = await options.executor.execute(call.action, {
        skillNames: options.skillNames,
        toolNames: options.toolNames,
      });
      recordExecuteStep(options, state.iteration, call.action, executeResult);
      return {
        toolCallId: call.toolCallId,
        action: call.action,
        executeResult,
      };
    }),
  );

  return {
    executeBatch,
    executeResult: null,
  };
}

async function observeNode(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): Promise<Partial<AgentGraphState>> {
  const batch = state.executeBatch;
  if (batch?.length && state.planResult) {
    const observations = batch.map((item) => observe(item.executeResult));
    options.hooks.onObserveStep({
      type: 'observe',
      iteration: state.iteration,
      observation: observations.join('\n'),
      node: 'observe',
    });

    const messages: LlmMessage[] = [
      ...state.messages,
      ...batch.map((item, index) => ({
        role: 'tool',
        tool_call_id: item.toolCallId,
        content: observations[index] ?? '',
      })),
    ];

    if (state.iteration >= options.maxIterations) {
      const output = resolveMaxIterationOutput(state);
      options.hooks.onFinalStep({
        type: 'final',
        iteration: state.iteration,
        output,
        node: 'observe',
      });

      return {
        messages,
        observation: observations.join('\n'),
        output,
        done: true,
        executeBatch: null,
      };
    }

    return {
      messages,
      observation: observations.join('\n'),
      planResult: null,
      executeResult: null,
      executeBatch: null,
      done: false,
    };
  }

  const executeResult = state.executeResult;
  if (!executeResult || !state.planResult) {
    return {};
  }

  const observation = observe(executeResult);
  options.hooks.onObserveStep({
    type: 'observe',
    iteration: state.iteration,
    observation,
    node: 'observe',
  });

  const toolCallId = state.planResult.toolCallId ?? crypto.randomUUID();
  const messages: LlmMessage[] = [
    ...state.messages,
    {
      role: 'tool',
      tool_call_id: toolCallId,
      content: observation,
    },
  ];

  if (state.iteration >= options.maxIterations) {
    const output = resolveMaxIterationOutput(state);
    options.hooks.onFinalStep({
      type: 'final',
      iteration: state.iteration,
      output,
      node: 'observe',
    });

    return {
      messages,
      observation,
      output,
      done: true,
    };
  }

  return {
    messages,
    observation,
    planResult: null,
    executeResult: null,
    executeBatch: null,
    done: false,
  };
}

function recordExecuteStep(
  options: BuildAgentGraphOptions,
  iteration: number,
  action: PlanAction,
  executeResult: ExecuteResult,
): void {
  if (action.type === 'tool' && action.name === 'invoke_agent') {
    return;
  }

  options.hooks.onExecuteStep({
    type: action.type as 'skill' | 'tool',
    iteration,
    name: action.name,
    args: action.args,
    result: executeResult.success ? executeResult.result : undefined,
    error: executeResult.error,
    ...(action.type === 'tool' && executeResult.source
      ? { source: executeResult.source }
      : {}),
    node: 'execute',
  });
}

interface CollectedToolCall {
  toolCallId: string;
  action: PlanAction;
}

function collectToolCalls(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): CollectedToolCall[] {
  const response = state.planResult?.response;
  if (response?.tool_calls?.length) {
    return response.tool_calls.map((call) => {
      const name = call.function.name;
      return {
        toolCallId: call.id ?? crypto.randomUUID(),
        action: {
          type: resolveActionType(name, options) ?? 'tool',
          name,
          args: parseToolArgs(call.function.arguments),
        },
      };
    });
  }

  const action = state.planResult?.action;
  if (!action || action.type === 'final' || !action.name) {
    return [];
  }

  return [
    {
      toolCallId: state.planResult?.toolCallId ?? crypto.randomUUID(),
      action,
    },
  ];
}

function resolveActionType(
  name: string,
  options: BuildAgentGraphOptions,
): PlanActionType | null {
  if (options.skillNames.has(name)) {
    return 'skill';
  }
  if (options.toolNames.has(name)) {
    return 'tool';
  }
  return null;
}

function parseToolArgs(raw: string): unknown {
  try {
    return JSON.parse(raw || '{}') as unknown;
  } catch {
    return {};
  }
}

function observe(result: ExecuteResult): string {
  return observeToolResult(result.success, result.result, result.error);
}
