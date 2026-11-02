# AI Agent 总览

<img src="assets/agent-loop.svg" alt="Agent 运行循环" />

Elpis 内置了一套基于 [LangGraph](https://langchain-ai.github.io/langgraphjs/) 的 Agent 运行时，和 Nest 服务跑在同一进程里。业务只需要「写配置 + 写函数」：

| 你要做的 | 放在哪里 | 文档 |
| --- | --- | --- |
| 接入大模型 | `config` → `ai.llm` | [LLM 接入](#ai/llm.md) |
| 定义一个 Agent | `app/agents/*.agent.ts` | [Agent](#ai/agent.md) |
| 给 Agent 写能力函数 | `app/skills/*.skill.ts` | [Skill](#ai/skill.md) |
| 在 Nest 服务里注册工具 | `ToolRegistryService.register()` | [Tool](#ai/tool.md) |
| 接入外部 MCP 服务 | `config` → `ai.mcp` | [MCP](#ai/mcp.md) |
| 私有知识库检索 | `config` → `ai.rag` / `ai.embedding` | [RAG](#ai/rag.md) |
| 多轮对话 | 请求携带 `threadId` | [记忆与多轮](#ai/memory.md) |
| 多 Agent 协作 | 工具 `invoke_agent` | [多 Agent](#ai/multi-agent.md) |
| 输入安全拦截 | `config` → `ai.guardrail` | [Guardrail](#ai/guardrail.md) |
| 观测与回归评测 | Trace / Eval | [Trace 与 Eval](#ai/trace-eval.md) |
| 前端调用 | `POST /api/ai/agent/run(/stream)` | [HTTP 与流式](#ai/api.md) |

## 运行流程

1. **Guardrail**：检查用户输入，命中规则直接返回一个 `guardrail` 步骤
2. **构建上下文**：`system`（Agent prompt）+ 线程历史 + 本次 `user` 输入
3. **plan**：调用 LLM，把该 Agent 可用的 Skill / Tool 作为 function tools 传给模型
4. **execute**：模型返回 `tool_calls` 时执行它们（支持一次多个），失败也会作为结果回填
5. **observe**：把执行结果作为 `tool` 消息加入上下文，回到 plan
6. **final**：模型不再调用工具，或达到 `ai.runtime.maxIterations`，输出最终回答
7. 每一步写入 `steps` 与 Trace，本轮对话写入线程记忆

## Step 类型

| type | 含义 |
| --- | --- |
| `plan` | 模型决策 |
| `skill` | 执行了一个 Skill |
| `tool` | 执行了一个 Tool（内置 / 自定义 / MCP） |
| `observe` | 结果回填 |
| `final` | 最终回答 |
| `guardrail` | 输入被拦截 |
| `delegation` | 委派给子 Agent，内含子步骤 `steps` |

## 五分钟跑通

**1. 配置模型**

```js
// config/config.local.js
module.exports = {
  ai: {
    llm: {
      default: 'qwen',
      models: {
        qwen: {
          provider: 'openai-compatible',
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          model: 'qwen-plus',
          apiKey: process.env.QWEN_API_KEY,
        },
      },
    },
  },
};
```

**2. 写一个 Skill**

```ts
// app/skills/weather.skill.ts
import type { SkillDefinition } from '@fsiaonma/elpis';

const weather: SkillDefinition = {
  name: 'weather',
  description: '查询城市天气',
  inputSchema: {
    type: 'object',
    properties: { city: { type: 'string', description: '城市名' } },
    required: ['city'],
  },
  async execute(input) {
    const { city } = input as { city: string };
    return { city, weather: '晴', temperature: 26 };
  },
};

export default weather;
```

**3. 写一个 Agent**

```ts
// app/agents/assistant.agent.ts
import type { AgentDefinition } from '@fsiaonma/elpis';

const agent: AgentDefinition = {
  name: 'assistant',
  skills: ['weather'],
  tools: [],
  prompt: '你是生活助手。用户问天气时调用 weather 获取真实数据后再回答。',
};

export default agent;
```

**4. 编译并调用**

```bash
npm run build:modules && npm run dev
```

```js
const res = await $curl({
  url: '/api/ai/agent/run',
  data: { agent: 'assistant', input: '杭州今天天气怎么样？' },
});
console.log(res.data.output, res.data.steps);
```
