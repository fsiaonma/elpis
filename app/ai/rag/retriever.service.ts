import { Inject, Injectable } from '@nestjs/common';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { ConfigService } from '../../config/config.service';
import { VECTOR_STORE, VectorStore } from '../store/store.interface';
import { resolveEmbedder } from './internal/load-embedding-config';
import { resolveChunker, resolveRagOptions } from './internal/load-rag-config';
import { RagRetrieveHit } from './rag.interface';

@Injectable()
export class RetrieverService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
  ) {}

  async ingestFromDirectory(dir: string): Promise<{ ingested: number; chunks: number }> {
    const absoluteDir = path.resolve(dir);
    const patterns = ['**/*.txt', '**/*.md'];
    const files = patterns
      .flatMap((pattern) => glob.sync(pattern, { cwd: absoluteDir, nodir: true }))
      .map((file) => path.resolve(absoluteDir, file));

    const uniqueFiles = [...new Set(files)];
    const chunker = resolveChunker(this.configService);
    const records: Array<{
      id: string;
      docId: string;
      text: string;
      embedding: number[];
      meta?: Record<string, unknown>;
    }> = [];

    for (const filePath of uniqueFiles) {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const docId = path.relative(absoluteDir, filePath);
      const chunks = chunker.chunk(content, { docId, sourcePath: filePath });
      if (chunks.length === 0) {
        continue;
      }

      const embeddings = await resolveEmbedder(this.configService).embed(
        chunks.map((chunk) => chunk.text),
      );
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        records.push({
          id: chunk.id,
          docId: chunk.docId,
          text: chunk.text,
          embedding: embeddings[index],
          meta: chunk.meta,
        });
      }
    }

    await this.vectorStore.upsert(records);

    return {
      ingested: uniqueFiles.length,
      chunks: records.length,
    };
  }

  async retrieve(query: string, topK?: number): Promise<RagRetrieveHit[]> {
    const options = resolveRagOptions(this.configService);
    const limit = topK ?? options.topK ?? 5;
    const [embedding] = await resolveEmbedder(this.configService).embed([query]);
    return this.vectorStore.query(embedding, limit);
  }
}
