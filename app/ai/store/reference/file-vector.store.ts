import fs from 'fs';
import path from 'path';
import { VectorQueryHit, VectorRecord, VectorStore } from '../store.interface';

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export class FileVectorStore implements VectorStore {
  private readonly indexPath: string;

  constructor(rootDir: string) {
    fs.mkdirSync(rootDir, { recursive: true });
    this.indexPath = path.join(rootDir, 'index.json');
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const current = await this.loadIndex();
    for (const record of records) {
      current.set(record.id, record);
    }
    await this.saveIndex(current);
  }

  async query(embedding: number[], topK: number): Promise<VectorQueryHit[]> {
    const current = await this.loadIndex();
    const hits = [...current.values()]
      .map((record) => ({
        id: record.id,
        docId: record.docId,
        text: record.text,
        score: cosineSimilarity(embedding, record.embedding),
        meta: record.meta,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(topK, 0));

    return hits;
  }

  private async loadIndex(): Promise<Map<string, VectorRecord>> {
    try {
      const raw = await fs.promises.readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(raw) as VectorRecord[];
      return new Map(parsed.map((record) => [record.id, record]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new Map();
      }
      throw error;
    }
  }

  private async saveIndex(index: Map<string, VectorRecord>): Promise<void> {
    const records = [...index.values()];
    await fs.promises.writeFile(this.indexPath, JSON.stringify(records, null, 2), 'utf-8');
  }
}
