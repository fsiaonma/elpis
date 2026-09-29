export interface LlmToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface LlmMessage {
  role: string;
  content: string;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
}

export interface LlmChatOptions {
  model?: string;
  tools?: Record<string, unknown>[];
  stream?: boolean;
}

export interface LlmProvider {
  chat(messages: LlmMessage[], options?: LlmChatOptions): Promise<LlmMessage>;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export type StepType = 'plan' | 'skill' | 'tool' | 'observe' | 'final' | 'guardrail';

export interface Step {
  type: StepType;
  iteration: number;
  [key: string]: unknown;
}

export type PlanActionType = 'skill' | 'tool' | 'final';

export interface PlanAction {
  type: PlanActionType;
  name?: string;
  args?: unknown;
  output?: string;
}

export interface PlanResult {
  action: PlanAction;
  response: LlmMessage;
  toolCallId?: string;
}

export interface ExecuteError {
  code: string;
  message: string;
}

export interface ExecuteResult {
  success: boolean;
  result?: unknown;
  error?: ExecuteError;
  source?: 'builtin' | 'mcp';
}

export interface RunResult {
  runId: string;
  output: string;
  steps: Step[];
  threadId: string;
}

export type AgentStreamEvent =
  | { event: 'delta'; data: { content: string } }
  | { event: 'step'; data: Step }
  | { event: 'done'; data: RunResult };
