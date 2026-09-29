import { Annotation } from '@langchain/langgraph';
import { ExecuteResult, LlmMessage, PlanResult } from '../../contracts';

export const AgentGraphAnnotation = Annotation.Root({
  messages: Annotation<LlmMessage[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  iteration: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  planResult: Annotation<PlanResult | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  executeResult: Annotation<ExecuteResult | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  observation: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  output: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  done: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
});

export type AgentGraphState = typeof AgentGraphAnnotation.State;
