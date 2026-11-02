# 内置接口

框架自带以下路由，业务代码可以直接使用，注意不要定义同名路由。

## 页面渲染

| 路由 | 说明 |
| --- | --- |
| `GET /view/:page` | 渲染 `app/public/dist/entry.<page>.tpl` |
| `GET /view/:page/*` | 同上，用于前端 history 路由的子路径，例如 `/view/dashboard/schema` |

渲染时注入的模板变量：

| 变量 | 来源 |
| --- | --- |
| `projKey` | URL query `proj_key`，前端为 `window.projKey` |
| `name` | 配置 `name` |
| `env` | `_ENV` |
| `options` | `serverStart(options)` 的 JSON |

模板不存在（例如访问了一个没有入口的 page）时会 302 到配置的 `homePage`。

## 项目接口 `api/project`

| 接口 | 参数 | 返回 |
| --- | --- | --- |
| `GET /api/project` | `proj_key` | 合并后的完整项目配置（含 `menu`） |
| `GET /api/project/list` | `proj_key`（可选） | 传入时返回该项目所属 model 下的全部项目，不传返回所有项目：`[{ modelKey, key, name, desc, homePage }]` |
| `GET /api/project/model_list` | — | 全部 model 及其项目 `[{ model: {key,name,desc}, project: { [key]: {...} } }]` |

dashboard 页面启动时会调用前两个接口生成菜单与项目切换列表。`model_list` 适合做「项目选择」首页，见 [model 与 project](#frontend/model.md)。

## AI 接口 `api/ai`

| 接口 | 说明 |
| --- | --- |
| `GET /api/ai/agent/list` | 已注册的 Agent |
| `GET /api/ai/tool/list` | 已注册的 Tool（含 MCP） |
| `GET /api/ai/agent/graph` | Agent 运行图结构 |
| `GET /api/ai/agent/config` | `{ threadEnabled }` |
| `GET /api/ai/trace/:runId` | 一次运行的完整 Trace |
| `POST /api/ai/agent/run` | 同步运行 Agent |
| `POST /api/ai/agent/run/stream` | SSE 流式运行 |

详见 [HTTP 与流式接口](#ai/api.md)。

## 兜底路由

所有未命中的 `GET` 请求由 `FallbackModule` 302 重定向到 `homePage`（未配置时为 `/`）。`homePage` 来自 `serverStart({ homePage })` 或配置项 `homePage`。
