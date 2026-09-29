# Part2 plan · Koa → 全 Nest

> 技术方案。回答：怎么拆层、改哪、对照怎么做。
> 需求见 spec.md，顺序见 tasks.md。

## 改哪 / 不改哪

| 改 | 不改 |
|----|------|
| elpis HTTP 内核：Koa → NestFactory | `serverStart()` 签名、8080 |
| demo auth / user / product 写成 `@Controller` | API 路径、返回格式、cookie |
| View 读者：Koa → Nest | Part1 的 `.tpl` 文件 |

## 策略

- **全量迁、一次删**：不做 Bridge。对照期可留 Koa 文件，验收后删除
- **先换内核，再搬家**：先让 `serverStart` 拉起 Nest，再迁 Project / 管道 / 业务 Module
- **先学对象再接线**：nest-demo 练 Module / Controller / Service / 管道，再打进 elpis

## 关键机制

- 七类 loader 职责找新家：中间件、router-schema、controller、service、配置、extend、路由
- 路由装饰器；Service 不碰 `ctx`
- DTO + ValidationPipe；失败必须是 HTTP 200 + `code: 442`（不是 Nest 默认 400）
- Guard / Filter / Interceptor 按 1.0 返回格式挂上；`proj_key` 用 Interceptor
- View 仍读 `.tpl`；静态资源 API 优先、静态兜底
- 产物走 `dist/`，不让 tsx 直跑 TS