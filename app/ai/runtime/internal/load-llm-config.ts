import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '../../../config/config.service';
import { LlmProvider } from '../../contracts';

export interface LlmProviderEntry {
  provider?: string;
  baseURL?: string;
  model?: string;
  apiKey?: string;
  use?: new (entry: LlmProviderEntry) => LlmProvider;
}

interface LlmConfig {
  default: string;
  models: Record<string, LlmProviderEntry>;
}

export type ResolvedLlm =
  | { kind: 'langchain'; model: ChatOpenAI }
  | { kind: 'custom'; provider: LlmProvider };

function getLlmConfig(configService: ConfigService): LlmConfig {
  const ai = configService.get('ai') as { llm?: LlmConfig } | undefined;
  if (!ai?.llm) {
    throw new Error('ai.llm config is missing');
  }
  return ai.llm;
}

function assertApiKey(modelName: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'xxxx') {
    throw new Error(
      `LLM model "${modelName}" apiKey is missing or still using placeholder "xxxx"`,
    );
  }
  return apiKey;
}

function toProviderEntry(modelConfig: LlmProviderEntry): LlmProviderEntry {
  const { use: _use, ...entry } = modelConfig;
  return entry;
}

function createChatModel(
  llm: LlmConfig,
  modelName: string,
  modelConfig: LlmProviderEntry,
): ChatOpenAI {
  const apiKey = assertApiKey(modelName, modelConfig.apiKey);

  return new ChatOpenAI({
    apiKey,
    model: modelConfig.model ?? modelName,
    configuration: {
      baseURL: modelConfig.baseURL?.replace(/\/$/, ''),
    },
  });
}

export function resolveLlm(
  configService: ConfigService,
  modelName?: string,
): ResolvedLlm {
  const llm = getLlmConfig(configService);
  const name = modelName ?? llm.default;
  const modelConfig = llm.models[name];

  if (!modelConfig) {
    throw new Error(`LLM model "${name}" is not configured in ai.llm.models`);
  }

  if (typeof modelConfig.use === 'function') {
    return {
      kind: 'custom',
      provider: new modelConfig.use(toProviderEntry(modelConfig)),
    };
  }

  if (modelConfig.provider === 'openai-compatible') {
    return {
      kind: 'langchain',
      model: createChatModel(llm, name, modelConfig),
    };
  }

  throw new Error(
    `Unsupported LLM provider "${modelConfig.provider ?? 'unknown'}" for model "${name}"`,
  );
}
