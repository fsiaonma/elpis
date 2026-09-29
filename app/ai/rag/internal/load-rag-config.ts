import path from 'path';
import { ConfigService } from '../../../config/config.service';
import { Chunker, RagOptions } from '../rag.interface';
import { DefaultChunker } from '../chunker';

interface VectorStoreConfig {
  fixturesPath?: string;
}

interface RagConfig extends RagOptions {
  fixtures?: {
    path?: string;
  };
}

const DEFAULT_RAG_OPTIONS: Required<Pick<RagOptions, 'chunk' | 'topK' | 'tool'>> = {
  chunk: {
    size: 800,
    overlap: 100,
  },
  topK: 5,
  tool: {
    name: 'retrieve',
    description: '从私有知识库检索相关片段；回答必须引用返回的 docId/text',
  },
};

function getRagConfig(configService: ConfigService): RagConfig {
  const ai = configService.get('ai') as { rag?: RagConfig } | undefined;
  return ai?.rag ?? {};
}

function getVectorStoreConfig(
  configService: ConfigService,
): VectorStoreConfig | undefined {
  const ai = configService.get('ai') as
    | { store?: { vector?: string | VectorStoreConfig } }
    | undefined;
  const vector = ai?.store?.vector;
  return typeof vector === 'object' ? vector : undefined;
}

export function resolveRagFixturesPath(configService: ConfigService): string {
  const vectorConfig = getVectorStoreConfig(configService);
  const fixturesFromStore = vectorConfig?.fixturesPath;
  if (typeof fixturesFromStore === 'string' && fixturesFromStore.trim() !== '') {
    return path.resolve(fixturesFromStore);
  }

  const rag = getRagConfig(configService);
  const fixturesFromRag = rag.fixtures?.path;
  if (typeof fixturesFromRag === 'string' && fixturesFromRag.trim() !== '') {
    return path.resolve(fixturesFromRag);
  }

  return path.resolve(process.cwd(), 'fixtures', 'rag');
}

export function resolveRagOptions(configService: ConfigService): RagOptions {
  const rag = getRagConfig(configService);

  return {
    chunk: {
      size: rag.chunk?.size ?? DEFAULT_RAG_OPTIONS.chunk.size,
      overlap: rag.chunk?.overlap ?? DEFAULT_RAG_OPTIONS.chunk.overlap,
    },
    topK: rag.topK ?? DEFAULT_RAG_OPTIONS.topK,
    tool: {
      name: rag.tool?.name ?? DEFAULT_RAG_OPTIONS.tool.name,
      description: rag.tool?.description ?? DEFAULT_RAG_OPTIONS.tool.description,
    },
    chunker: rag.chunker,
  };
}

export function resolveChunker(configService: ConfigService): Chunker {
  const options = resolveRagOptions(configService);

  if (typeof options.chunker?.use === 'function') {
    return new options.chunker.use();
  }

  return new DefaultChunker({
    size: options.chunk!.size,
    overlap: options.chunk!.overlap,
  });
}
