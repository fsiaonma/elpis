import { Chunk, Chunker } from './rag.interface';

export interface ChunkTextOptions {
  size: number;
  overlap: number;
}

export function chunkText(
  text: string,
  options: ChunkTextOptions,
  meta?: Record<string, unknown>,
  docId = 'document',
): Chunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const { size, overlap } = options;
  if (size <= 0) {
    return [];
  }

  const step = Math.max(size - overlap, 1);
  const chunks: Chunk[] = [];

  for (let start = 0; start < normalized.length; start += step) {
    const end = Math.min(start + size, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (!slice) {
      continue;
    }

    chunks.push({
      id: `${docId}#${chunks.length}`,
      docId,
      text: slice,
      meta,
    });

    if (end >= normalized.length) {
      break;
    }
  }

  return chunks;
}

export class DefaultChunker implements Chunker {
  constructor(private readonly options: ChunkTextOptions) {}

  chunk(text: string, meta?: Record<string, unknown>): Chunk[] {
    const docId =
      typeof meta?.docId === 'string' && meta.docId.trim() !== ''
        ? meta.docId
        : 'document';

    return chunkText(text, this.options, meta, docId);
  }
}
