# Part3 plan · Agent Runtime Harness

> 技术方案。回答：怎么拆层、改哪、对照怎么做。
> 需求见 spec.md，顺序见 tasks.md。

## 改哪 / 不改哪

| 改 | 不改 |
|----|------|
| 新建 `app/ai/` 分层目录与 Nest Module 聚合 | `serverStart()` / `frontendBuild()` 签名 |
| 框架提供 LLM / Agent / 流式协议 / 扫描注册 | API 路径与返回格式（442 / 445 / 446） |
| demo 注入 Skill、Store、MCP、RAG fixture、Eval 数据集 | Part1 `.tpl` / 双终端 / 9002 脚本 |
| demo `app/pages/` 下 Chat / Trace / Eval 等 custom 页 | 框架 `moduleType` 枚举 |

## 分层

```
app/ai/
  llm/          OpenAI 兼容 Provider + 注册表
  embedding/    向量化接口（实现由 demo 注入或走同 Provider）
  store/        Trace / Thread / Checkpoint / 向量索引 — 纯接口
  skill/        可扫描的业务能力单元（demo dist/skills）
  tool/         Agent 可调用的工具声明与执行桥
  mcp/          MCP 客户端：外部进程 tool 与内置 Skill 同形态
  agent/        纯声明：name / tools / skills / 编排策略
  runtime/      Orchestrator：run / stream / step 收集
  rag/          检索管线：chunk / embed / search（Store 落库）
  memory/       Thread + Checkpoint 读写（Store 实现）
  guardrail/    输入输出拦截，写 Trace
  trace/        runId 级步骤回放（读 Store）
  eval/         CLI 跑 pass/fail，报告供前端页读取
```

## 三种复用方式

| 方式 | 适用 | 示例 |
|------|------|------|
| **扫描注册** | demo 产物进 dist，框架启动时扫 | `dist/skills/*.js`、`dist/agents/*.js`、Tool 装饰器 |
| **接口 + 换实现** | 框架定契约，demo 注入具体类 | `Store`、`LlmProvider`、`EmbeddingProvider` |
| **纯框架逻辑** | 与业务无关的编排与协议 | Orchestrator、流式 SSE、Guardrail 钩子、step 形态 |

## 框架无状态

- Trace、记忆、向量索引**一律走 Store 接口**；框架不内置文件路径或 SQLite
- 实现与存储路径由 demo `config.default.js` → `ai.store` 注入
- 重启服务：框架零残留；同 `threadId` 上下文仍在 = Store 实现正确，不是框架内存

## 模型接入

- **一份 OpenAI 兼容 Provider** 覆盖大部分厂商（baseURL + apiKey + model 走配置）
- 选型链：`elpis-demo/config/config.default.js` → `ai.llm.default`（改一行换厂商仍通）
- 框架未内置的模型：demo 实现 `LlmProvider` 并注册进框架注册表
- Chat 与 Agent 共用 LLM 通路，不另起 HTTP 栈

## 关键机制

### HTTP 面

| 路径 | 说明 |
|------|------|
| `POST /api/ai/chat` | 非 Agent 对话（T2 验证 LLM 通路） |
| `POST /api/ai/chat/stream` | 逐字 SSE |
| `GET /api/ai/tool/list` | 已注册 Tool |
| `GET /api/ai/agent/list` | 已注册 Agent（纯声明） |
| `POST /api/ai/agent/run` | `{ runId, output, steps }` |
| `POST /api/ai/agent/run/stream` | step 增量 + `done` 同构 JSON |

鉴权：复用 Part2 Guard / 验签；`/api/ai/*` 与业务 API 同等对待。

### Agent 执行

- **Agent** = 声明（可用哪些 Skill / Tool / 子 Agent），**不含**执行逻辑
- **Orchestrator** = 唯一执行入口：选 Agent → 调 LLM → 解析 tool call → 调 Skill / Tool / MCP → 写 steps → 汇总 output
- `steps` 可见：轮次、skill 名、tool 参数与结果、Guardrail 拦截、RAG 命中片段

### 流式协议

- 增量事件：`step` / `token`（按端点语义）
- 终态事件：`done`，payload **与** `POST /api/ai/agent/run` JSON **同构**
- 前端 `agent-chat` 逐字渲染；`tool-call-card` 按 step 形态渲染

### 前端（elpis-demo）

- Chat / Trace / Eval 页：`moduleType: custom` + `customConfig.path`
- 组件：`agent-chat`、`tool-call-card` 等放在 demo `app/pages/dashboard/...`
- 框架 `app/pages/` **不新增** Agent 专用 moduleType 或入口

### RAG / MCP / Multi-Agent

- RAG：fixture → embed → Store；`ai.rag.chunk` 配置切分粒度
- MCP：demo config 声明 server 列表；外部进程 tool 在 steps 中与内置 Skill **同形态**
- Multi-Agent：Orchestrator 支持委派；steps 可见 agent → sub-agent 链路

### Eval

- `npm run eval`（demo 或根脚本）产出 pass/fail 报告
- Eval 页读同一份报告文件；**框架不提供** `/api/ai/eval`

## 目录轮廓（实现可微调，职责不能丢）

```
app/ai/
  ai.module.ts              聚合注册
  llm/
  embedding/
  store/                    接口 + 内存 Stub（仅测试）
  skill/
  tool/
  mcp/
  agent/
  runtime/
  rag/
  memory/
  guardrail/
  trace/
  eval/                     CLI 入口类型，非 Controller

elpis-demo/
  app/modules/ai/           demo Nest Module：注入 Store / Provider / MCP
  app/skills/               → build:modules → dist/skills/
  app/agents/
  config/config.default.js  ai.llm / ai.store / ai.rag / ai.mcp
  app/pages/dashboard/      agent-chat、trace、eval custom 页
```
