import fs from 'fs';
import path from 'path';
import { TraceRun, TraceStore } from '../store.interface';

export class FileTraceStore implements TraceStore {
  constructor(private readonly rootDir: string) {
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  async save(run: TraceRun): Promise<void> {
    const filePath = this.resolvePath(run.runId);
    await fs.promises.writeFile(filePath, JSON.stringify(run, null, 2), 'utf-8');
  }

  async load(runId: string): Promise<TraceRun | null> {
    const filePath = this.resolvePath(runId);

    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as TraceRun;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private resolvePath(runId: string): string {
    const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.rootDir, `${safeRunId}.json`);
  }
}
