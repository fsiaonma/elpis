# Part3 spec · Agent Runtime Harness

> 需求分析。先走完 spec → plan → tasks，再贴实现 Prompt（开头钉三件套）。本文件在 **elpis** 仓库。

## 目标

在已有 Vite + Nest 之上，给 elpis 加一层**可上线的 Agent Runtime Harness**。框架提供运行时、协议与扩展点；业务（查项目、RAG 语料、MCP 进程、模型选型）全部在 elpis-demo 注入，不把 demo 逻辑写进框架。

## 稳定面（合同）

- `serverStart()` / `frontendBuild()` 签名不变；8080 / 9002 双终端不变
- `POST /api/ai/agent/run` 返回 `{ runId, output, steps }`，**字段名锁死**
- 流式端点 `done` 事件 payload 与 JSON 端点**同构**（同样含 `runId` / `output` / `steps`）
- `/api/ai/*` 走登录 + 验签，**不进白名单**；演示不得关鉴权
- 前端全部在 **elpis-demo**：页面走已有 `moduleType: custom` 扩展位；框架**不新增** `moduleType`
- demo 通过 `build:modules` 产出 `dist/skills/*.js` 等可扫描产物，框架只读注册表

## 禁止

- demo 里自写 `runAgent()` 绕过框架 Orchestrator
- 把「查项目」这类**业务语义**写进框架（框架只有 Skill / Tool 接口与扫描）
- 为 Chat 另起 `index.html` 或独立前端工程
- 改 `runId` / `output` / `steps` 字段名
- 为演示关掉鉴权或把 `/api/ai/*` 加入白名单
- 框架暴露 `/api/ai/eval`（eval 走 CLI + 前端页，不走 HTTP API）

## 验收（Part 结束）

- T1–T14 任务板逐条达标（见 tasks.md）
- walkthrough 覆盖：流式、MCP、RAG、记忆、Guardrail、Trace、Eval、多 Agent
- **无状态验收**：重启服务后，框架本身不持有 Trace / 向量 / 会话；持久化一律经 demo 注入的 Store 实现
- Part1 / Part2 稳定面未被破坏：dashboard CRUD、442 / 445 / 446、cookie 行为不变
