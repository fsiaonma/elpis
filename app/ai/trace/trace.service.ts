import { Inject, Injectable } from '@nestjs/common';
import { Step } from '../contracts';
import { TRACE_STORE, TraceRun, TraceStore } from '../store/store.interface';

@Injectable()
export class TraceService {
  private readonly activeRuns = new Map<string, TraceRun>();

  constructor(@Inject(TRACE_STORE) private readonly traceStore: TraceStore) {}

  createRun(meta: { agentName: string; input: unknown }): string {
    const runId = crypto.randomUUID();
    const run: TraceRun = {
      runId,
      agentName: meta.agentName,
      input: meta.input,
      steps: [],
      createdAt: new Date().toISOString(),
    };

    this.activeRuns.set(runId, run);
    return runId;
  }

  addStep(runId: string, step: Step): void {
    const run = this.activeRuns.get(runId);
    if (!run) {
      return;
    }

    run.steps.push(step);
    void this.traceStore.save(run);
  }

  finalize(runId: string, output: string): void {
    const run = this.activeRuns.get(runId);
    if (!run) {
      return;
    }

    run.output = output;
    void this.traceStore.save(run);
  }

  async load(runId: string): Promise<TraceRun | null> {
    const active = this.activeRuns.get(runId);
    if (active) {
      return active;
    }

    return this.traceStore.load(runId);
  }
}
