# Part2 spec · Koa → 全 Nest

> 需求分析。先走完 spec → plan → tasks，再贴实现 Prompt（开头钉三件套）。本文件在 **elpis** 仓库。

## 目标

删除 Koa 内核，框架和 demo 都用 Nest Module 写法。对外启动方式和 1.0 API 行为不变。

## 稳定面（合同）

- `serverStart()` / `frontendBuild()` 签名不变
- API 路径与返回格式与 1.0 一致（含 442 / 445 / 446）
- demo `server.js` 仍三行启动；8080 监听不变

## 禁止

- 框架 Nest、demo Koa、中间加 BusinessBridge
- 顺手改字段名「进化」API
- `tsx` 绕过 `dist` 契约
- 本 Part 写 Agent / LLM

## 验收（Part 结束）

- 登录 + Auth / User / Product 与 1.0 行为一致
- dashboard 8080 出页面，脚本仍来自 9002
- 仓库里不再有 Koa 内核