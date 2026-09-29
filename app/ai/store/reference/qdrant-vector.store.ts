import { createHash } from 'node:crypto';
import { VectorQueryHit, VectorRecord, VectorStore } from '../store.interface';

interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

interface QdrantSearchResponse {
  result?: QdrantSearchResult[];
}

function stablePointId(recordId: string): string {
  const bytes = createHash('sha256').update(recordId, 'utf8').digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export class QdrantVectorStore implements VectorStore {
  private readonly baseUrl: string;

  constructor(
    url: string,
    private readonly collection: string,
  ) {
    this.baseUrl = normalizeBaseUrl(url);
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const vectorSize = records[0].embedding.length;
    console.error(
      `[QdrantVectorStore] upsert ${records.length} record(s) into collection "${this.collection}"`,
    );

    await this.deleteCollectionIfExists();
    await this.createCollection(vectorSize);

    const points = records.map((record) => ({
      id: stablePointId(record.id),
      vector: record.embedding,
      payload: {
        id: record.id,
        docId: record.docId,
        text: record.text,
        ...(record.meta !== undefined ? { meta: record.meta } : {}),
      },
    }));

    await this.request('PUT', `/collections/${encodeURIComponent(this.collection)}/points`, {
      points,
    });
  }

  async query(embedding: number[], topK: number): Promise<VectorQueryHit[]> {
    const limit = Math.max(topK, 0);
    if (limit === 0) {
      return [];
    }

    console.error(
      `[QdrantVectorStore] query collection "${this.collection}" topK=${limit}`,
    );

    const response = await this.request<QdrantSearchResponse>(
      'POST',
      `/collections/${encodeURIComponent(this.collection)}/points/search`,
      {
        vector: embedding,
        limit,
        with_payload: true,
      },
    );

    const results = response.result ?? [];
    return results.map((hit) => this.toQueryHit(hit));
  }

  private toQueryHit(hit: QdrantSearchResult): VectorQueryHit {
    const payload = hit.payload ?? {};
    const id =
      typeof payload.id === 'string'
        ? payload.id
        : typeof hit.id === 'string'
          ? hit.id
          : String(hit.id);
    const docId = typeof payload.docId === 'string' ? payload.docId : '';
    const text = typeof payload.text === 'string' ? payload.text : '';
    const meta =
      payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
        ? (payload.meta as Record<string, unknown>)
        : undefined;

    return {
      id,
      docId,
      text,
      score: hit.score,
      meta,
    };
  }

  private async deleteCollectionIfExists(): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/collections/${encodeURIComponent(this.collection)}`,
      { method: 'DELETE' },
    );

    if (response.status === 404) {
      return;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Qdrant delete collection failed (${response.status}): ${body}`,
      );
    }

    console.error(`[QdrantVectorStore] deleted collection "${this.collection}"`);
  }

  private async createCollection(vectorSize: number): Promise<void> {
    await this.request('PUT', `/collections/${encodeURIComponent(this.collection)}`, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    });
    console.error(
      `[QdrantVectorStore] created collection "${this.collection}" size=${vectorSize}`,
    );
  }

  private async request<T = unknown>(
    method: string,
    pathname: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Qdrant ${method} ${pathname} failed (${response.status}): ${errorBody}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (text.trim() === '') {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }
}
