import { OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '../../../config/config.service';
import { EmbeddingProvider } from '../../contracts';

export interface EmbeddingProviderEntry {
  provider?: string;
  baseURL?: string;
  model?: string;
  apiKey?: string;
  use?: new (entry: EmbeddingProviderEntry) => EmbeddingProvider;
}

interface EmbeddingConfig {
  default: string;
  models: Record<string, EmbeddingProviderEntry>;
}

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

function getEmbeddingConfig(configService: ConfigService): EmbeddingConfig {
  const ai = configService.get('ai') as { embedding?: EmbeddingConfig } | undefined;
  if (!ai?.embedding) {
    throw new Error('ai.embedding config is missing');
  }
  return ai.embedding;
}

function assertApiKey(modelName: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'xxxx') {
    throw new Error(
      `Embedding model "${modelName}" apiKey is missing or still using placeholder "xxxx"`,
    );
  }
  return apiKey;
}

function toProviderEntry(modelConfig: EmbeddingProviderEntry): EmbeddingProviderEntry {
  const { use: _use, ...entry } = modelConfig;
  return entry;
}

export function resolveEmbedder(
  configService: ConfigService,
  modelName?: string,
): Embedder {
  const embedding = getEmbeddingConfig(configService);
  const name = modelName ?? embedding.default;
  const modelConfig = embedding.models[name];

  if (!modelConfig) {
    throw new Error(
      `Embedding model "${name}" is not configured in ai.embedding.models`,
    );
  }

  if (typeof modelConfig.use === 'function') {
    const provider = new modelConfig.use(toProviderEntry(modelConfig));
    return {
      embed: (texts: string[]) => provider.embed(texts),
    };
  }

  if (modelConfig.provider === 'openai-compatible') {
    const apiKey = assertApiKey(name, modelConfig.apiKey);
    const embeddings = new OpenAIEmbeddings({
      apiKey,
      model: modelConfig.model ?? name,
      configuration: {
        baseURL: modelConfig.baseURL?.replace(/\/$/, ''),
      },
    });

    return {
      embed: async (texts: string[]) => {
        if (texts.length === 0) {
          return [];
        }
        return embeddings.embedDocuments(texts);
      },
    };
  }

  throw new Error(
    `Unsupported embedding provider "${modelConfig.provider ?? 'unknown'}" for model "${name}"`,
  );
}
