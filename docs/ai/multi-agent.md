# 多 Agent 协作

通过内置工具 `invoke_agent`，一个 Agent 可以把子任务委派给另一个 Agent，形成 **Supervisor → Worker** 结构。

```text
studio-supervisor
 ├─ invoke_agent → profile-analyst   （解析简历、生成画像）
 ├─ invoke_agent → match-scorer      （岗位匹配打分）
 └─ 汇总输出
```

## 定义 Supervisor

```ts
// app/agents/studio-supervisor.agent.ts
import type { AgentDefinition } from '@fsiaonma/elpis';
import prompt from '../prompts/studio-supervisor.prompt';

// 只负责调度，不直接干活
const agent: AgentDefinition = {
  name: 'studio-supervisor',
  skills: [],
  tools: ['invoke_agent'],
  model: 'qwen',
  prompt,
};

export default agent;
```

```ts
// app/prompts/studio-supervisor.prompt.ts
export default `你是简历工作室的调度员，只会派人，不自己分析。
1. 先调用 invoke_agent，agent=profile-analyst，input 为用户给出的 resumeId，得到候选人画像；
2. 再调用 invoke_agent，agent=match-scorer，input 为上一步画像 JSON；
3. 汇总两者结果，用中文输出结论与理由。`;
```

## 定义 Worker

Worker 就是普通 Agent，拥有各自的 Skill / Tool：

```ts
const agent: AgentDefinition = {
  name: 'profile-analyst',
  skills: ['read-resume-brief', 'profile-assemble'],
  tools: ['parse_resume', 'retrieve'],
  prompt: '...',
};
```

## invoke_agent

| 入参 | 说明 |
| --- | --- |
| `agent` | 目标 Agent 名 |
| `input` | 传给子 Agent 的输入（对象会被 JSON 序列化） |

返回 `{ runId, output }`，失败时返回 `{ ok: false, error: { code, message } }`：

| code | 原因 |
| --- | --- |
| `DELEGATION_DEPTH_EXCEEDED` | 超过 `ai.runtime.maxDelegationDepth`（默认 2） |
| `DELEGATION_CYCLE` | 目标 Agent 已在调用栈上（防止 A → B → A） |
| `AGENT_NOT_FOUND` | 目标 Agent 不存在 |
| `GUARDRAIL_BLOCKED` | 委派输入命中 Guardrail |

## 观测

- 父 Agent 的 steps 中出现 `type: 'delegation'` 步骤，包含 `agent`、`childRunId`、`status`（running / done）以及子步骤 `steps`
- 流式接口中，子 Agent 的每个步骤会实时转发，并带上 `agent` 与 `parentRunId`
- 子 Agent 有独立的 Trace，可通过 `GET /api/ai/trace/:childRunId` 查看

## 建议

- Supervisor 的 prompt 写清楚顺序与数据如何在 Worker 之间传递
- Worker 职责单一，输出结构化，便于下一个 Worker 使用
- 调度链路较长时适当调大 `ai.runtime.maxIterations`
