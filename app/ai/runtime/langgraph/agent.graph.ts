import { END, START, StateGraph } from '@langchain/langgraph';
import { ExecuteResult, Step } from '../../contracts';
import { ExecutorService } from '../../tool/executor.service';
import { LangChainPlannerService } from '../langchain/langchain-planner.service';
import { AgentGraphAnnotation, AgentGraphState } from './agent.state';

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

async function planNode(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): Promise<Partial<AgentGraphState>> {
  const iteration = state.iteration + 1;

  if (iteration > options.maxIterations && !state.done) {
    const output = 'Reached maximum iterations without a final answer.';
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
    };
  }

  return {
    messages,
    iteration,
    planResult,
    executeResult: null,
    observation: null,
    done: false,
  };
}

async function executeNode(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): Promise<Partial<AgentGraphState>> {
  const action = state.planResult?.action;
  if (!action || action.type === 'final') {
    return {};
  }

  const executeResult = await options.executor.execute(action, {
    skillNames: options.skillNames,
    toolNames: options.toolNames,
  });

  options.hooks.onExecuteStep({
    type: action.type,
    iteration: state.iteration,
    name: action.name,
    args: action.args,
    result: executeResult.success ? executeResult.result : undefined,
    error: executeResult.error,
    ...(action.type === 'tool' && executeResult.source
      ? { source: executeResult.source }
      : {}),
    node: 'execute',
  });

  return {
    executeResult,
  };
}

async function observeNode(
  state: AgentGraphState,
  options: BuildAgentGraphOptions,
): Promise<Partial<AgentGraphState>> {
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
  const messages = [
    ...state.messages,
    {
      role: 'tool',
      tool_call_id: toolCallId,
      content: observation,
    },
  ];

  if (state.iteration >= options.maxIterations) {
    const output = 'Reached maximum iterations without a final answer.';
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
    done: false,
  };
}

function observe(result: ExecuteResult): string {
  if (result.success) {
    return JSON.stringify({ ok: true, result: result.result });
  }

  return JSON.stringify({ ok: false, error: result.error });
}
