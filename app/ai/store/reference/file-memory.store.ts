import fs from 'fs';
import path from 'path';
import { MemoryStore, ThreadCheckpoint } from '../store.interface';

export class FileMemoryStore implements MemoryStore {
  constructor(private readonly rootDir: string) {
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  async save(checkpoint: ThreadCheckpoint): Promise<void> {
    const filePath = this.resolvePath(checkpoint.threadId);
    await fs.promises.writeFile(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  async load(threadId: string): Promise<ThreadCheckpoint | null> {
    const filePath = this.resolvePath(threadId);

    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as ThreadCheckpoint;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private resolvePath(threadId: string): string {
    const safeThreadId = threadId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.rootDir, `${safeThreadId}.json`);
  }
}
