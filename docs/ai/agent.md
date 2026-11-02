# Agent

一个 Agent = **系统提示词** + **可用的 Skill / Tool 白名单** + **使用哪个模型**。

## 定义

```ts
// app/agents/project-assistant.agent.ts
import type { AgentDefinition } from '@fsiaonma/elpis';
import systemPrompt from '../prompts/project-assistant.prompt';

const agent: AgentDefinition = {
  name: 'project-assistant',
  skills: ['project-query'],
  tools: ['retrieve', 'list_directory', 'write_file'],
  prompt: systemPrompt,
};

export default agent;
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | ✓ | 全局唯一，调用时用它 |
| `skills` | ✓ | 可调用的 Skill 名列表，可为空数组 |
| `tools` | ✓ | 可调用的 Tool 名列表，包括内置、自定义注册、MCP 工具 |
| `prompt` | 二选一 | 系统提示词字符串 |
| `promptFile` | 二选一 | 提示词文件路径，相对于**编译后的 agent 文件**，按纯文本读取 |
| `model` | — | `ai.llm.models` 中的名字，默认 `ai.llm.default` |

## 注册规则

- 文件：`app/agents/**/*.agent.ts` → 编译到 `dist/agents/**/*.agent.js`
- `export default` 一个定义对象
- 缺少 `name` / `skills` / `tools` / `prompt|promptFile` 会被跳过并打印 `[AgentScanner] skip invalid agent`
- 启动日志：`[AgentScanner] registered agents: [...]`

> Agent **只能**调用自己 `skills` 与 `tools` 中列出的能力。名字写错不会报错，但模型看不到这个工具。可以通过 `GET /api/ai/tool/list` 查看所有可用工具名。

## Prompt 组织

推荐把提示词放到 `app/prompts/`，通过 `import` 引用（TS 编译后天然可用）：

```ts
// app/prompts/project-assistant.prompt.ts
const systemPrompt = `你是项目助手，可查询项目配置。
- 用户询问项目信息时，使用 project-query 按 projKey 获取真实数据后再回答，不要编造。
- 回答内部文档相关问题时，先调用 retrieve 检索；回答必须引用检索结果中的 docId。
- 检索不到时明确说未找到。`;

export default systemPrompt;
```

使用 `promptFile` 时注意：文件内容会被**原样当作文本**读取，路径相对于 `dist/agents/xxx.agent.js`。适合指向纯文本文件，例如：

```ts
promptFile: '../../app/prompts/project-assistant.md',
```

### Prompt 写作建议

- 明确何时调用哪个工具，以及「拿到结果后再回答，不要编造」
- 说明工具参数的格式与边界（例如路径相对哪个根目录）
- 对 Supervisor 类 Agent，写清楚先派谁、后派谁、如何汇总

## 调用

```js
// 同步
await $curl({ url: '/api/ai/agent/run', data: { agent: 'project-assistant', input: '查询 jd 项目配置' } });

// 流式
// 见 HTTP 与流式接口
```

`input` 可以是字符串，也可以是对象（会被 `JSON.stringify` 后作为用户消息）：

```js
data: { agent: 'resume-analyst', input: { resumeId: 'r_001', jobId: 'j_002' } }
```

在 Nest 服务中直接调用见 [HTTP 与流式接口 · 服务端调用](#ai/api.md)。

## 查看

| 接口 | 返回 |
| --- | --- |
| `GET /api/ai/agent/list` | 所有 Agent 定义（含解析后的 prompt） |
| `GET /api/ai/agent/graph` | 运行图节点与边，可用于可视化 |
