# LLM 接入

所有模型在 `ai.llm` 中统一声明，Agent 通过名字引用。

## OpenAI 兼容模型

绝大多数厂商都提供 OpenAI 兼容接口，直接配置即可：

```js
module.exports = {
  ai: {
    llm: {
      default: 'qwen',                 // Agent 未指定 model 时使用
      models: {
        qwen: {
          provider: 'openai-compatible',
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          model: 'qwen-plus',
          apiKey: process.env.QWEN_API_KEY,
        },
        deepseek: {
          provider: 'openai-compatible',
          baseURL: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat',
          apiKey: process.env.DEEPSEEK_API_KEY,
        },
        openai: {
          provider: 'openai-compatible',
          baseURL: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY,
        },
        ollama: {
          provider: 'openai-compatible',
          baseURL: 'http://127.0.0.1:11434/v1',
          model: 'qwen2.5:7b',
          apiKey: 'ollama',            // 本地服务随便填一个非空值
        },
      },
    },
  },
};
```

| 字段 | 说明 |
| --- | --- |
| `provider` | 目前内置 `openai-compatible`（基于 `@langchain/openai`） |
| `baseURL` | 接口地址，末尾 `/` 会被去掉 |
| `model` | 模型名，不填时使用配置的 key |
| `apiKey` | 必填；为空或为占位值 `xxxx` 时运行会报错 |

> 模型需要支持 function calling（tools），Agent 才能调用 Skill / Tool。

## 按 Agent 选择模型

```ts
const agent: AgentDefinition = {
  name: 'supervisor',
  model: 'deepseek',   // 对应 ai.llm.models.deepseek
  skills: [],
  tools: ['invoke_agent'],
  prompt: '...',
};
```

## 自定义 Provider

模型不兼容 OpenAI 协议、需要走内网网关、或想离线 Mock 时，实现 `LlmProvider` 并通过 `use` 注入。

```ts
// app/llm-providers/mock.provider.ts
import type { LlmChatOptions, LlmMessage, LlmProvider } from '@fsiaonma/elpis';

export class MockProvider implements LlmProvider {
  // 构造参数为该模型的配置（去掉 use 之后的字段）
  constructor(_entry: { baseURL?: string; model?: string; apiKey?: string }) {}

  async chat(messages: LlmMessage[], _options?: LlmChatOptions): Promise<LlmMessage> {
    const last = messages[messages.length - 1];
    return { role: 'assistant', content: `[mock] ${last.content}` };
  }
}
```

```js
// config/config.default.js
const { MockProvider } = require('../dist/llm-providers/mock.provider');

module.exports = {
  ai: {
    llm: {
      default: 'qwen',
      models: {
        mock: { use: MockProvider },
      },
    },
  },
};
```

记得把 `app/llm-providers/**/*.ts` 加进 `tsconfig.include`。

### 支持工具调用

`chat` 的 `options.tools` 是 OpenAI 格式的 function 列表。要让 Agent 调用工具，返回值带上 `tool_calls`：

```ts
async chat(messages: LlmMessage[], options?: LlmChatOptions): Promise<LlmMessage> {
  const resp = await myGateway.chat({ messages, tools: options?.tools });
  return {
    role: 'assistant',
    content: resp.content ?? '',
    tool_calls: resp.toolCalls?.map((c) => ({
      id: c.id,
      type: 'function',
      function: { name: c.name, arguments: JSON.stringify(c.args) },
    })),
  };
}
```

### 类型

```ts
interface LlmMessage {
  role: string;            // system / user / assistant / tool
  content: string;
  tool_calls?: { id?: string; type?: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;   // role 为 tool 时对应的调用 id
}

interface LlmChatOptions {
  model?: string;
  tools?: Record<string, unknown>[];
  stream?: boolean;
}

interface LlmProvider {
  chat(messages: LlmMessage[], options?: LlmChatOptions): Promise<LlmMessage>;
}
```

## 运行参数

```js
ai: {
  runtime: {
    maxIterations: 5,        // plan → execute 的最大轮数，默认 5
    maxDelegationDepth: 2,   // invoke_agent 最大嵌套深度，默认 2
  },
}
```

复杂任务（例如 Supervisor 调度多个子 Agent）可以把 `maxIterations` 调大。

## Embedding 模型

RAG 使用的向量模型在 `ai.embedding` 中配置，结构与 `ai.llm` 一致，自定义时实现 `EmbeddingProvider.embed(texts): Promise<number[][]>`。见 [RAG](#ai/rag.md)。
