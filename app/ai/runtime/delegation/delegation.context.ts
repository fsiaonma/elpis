import { AsyncLocalStorage } from 'node:async_hooks';
import { AgentStreamEvent, Step } from '../../contracts';

export type StepEmitter = (event: AgentStreamEvent) => void;

export interface DelegationContext {
  runId: string;
  agentName: string;
  agentStack: string[];
  depth: number;
  parentSteps: Step[];
  iteration: number;
  emit?: StepEmitter;
}

export const delegationContext = new AsyncLocalStorage<DelegationContext>();

export function runWithDelegationContext<T>(
  context: DelegationContext,
  fn: () => Promise<T>,
): Promise<T> {
  return delegationContext.run(context, fn);
}
