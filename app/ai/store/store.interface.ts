export interface TraceRun {
  runId: string;
  agentName?: string;
  input?: unknown;
  output?: string;
  steps: unknown[];
  createdAt?: string;
}

export interface TraceStore {
  save(run: TraceRun): Promise<void>;
  load(runId: string): Promise<TraceRun | null>;
}

export interface MemoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface ThreadCheckpoint {
  threadId: string;
  messages: MemoryEntry[];
  updatedAt: number;
}

export interface MemoryStore {
  save(checkpoint: ThreadCheckpoint): Promise<void>;
  load(threadId: string): Promise<ThreadCheckpoint | null>;
  delete?(threadId: string): Promise<void>;
}

export interface VectorRecord {
  id: string;
  docId: string;
  text: string;
  embedding: number[];
  meta?: Record<string, unknown>;
}

export interface VectorQueryHit {
  id: string;
  docId: string;
  text: string;
  score: number;
  meta?: Record<string, unknown>;
}

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  query(embedding: number[], topK: number): Promise<VectorQueryHit[]>;
}

export const TRACE_STORE = Symbol('TRACE_STORE');
export const MEMORY_STORE = Symbol('MEMORY_STORE');
export const VECTOR_STORE = Symbol('VECTOR_STORE');
