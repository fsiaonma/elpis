# 项目结构与扫描约定

<img src="assets/architecture.svg" alt="Elpis 整体架构" />

Elpis 的核心思想是**约定优于配置**：业务仓库按目录与文件名约定放代码，框架启动时自动扫描注册，不需要写任何注册代码。

## 自动扫描清单

| 位置（编译后） | 文件规则 | 注册为 | 说明 |
| --- | --- | --- | --- |
| `dist/modules/**` | `*.module.js`，导出类名以 `Module` 结尾 | Nest 模块 | 所有业务 Controller / Service 的入口 |
| `dist/agents/**` | `*.agent.js`，`export default` | Agent | 见 [Agent](#ai/agent.md) |
| `dist/skills/**` | `*.skill.js`，`export default` | Skill | 见 [Skill](#ai/skill.md) |
| `app/prompts/**` | 任意 | — | 不扫描，由 Agent 通过 `import` 或 `promptFile` 引用 |
| `dist/eval/**` | `*.cases.js` | 评测用例 | 由评测脚本按 `ai.eval.casesGlob` 读取，见 [Trace 与 Eval](#ai/trace-eval.md) |
| `config/` | `config.{default,local,beta,prod}.js` | 配置 | 见 [配置](#guide/config.md) |
| `model/<model>/` | `model.js` + `project/*.js` | 中后台项目 | 见 [model 与 project](#frontend/model.md) |
| `app/pages/**` | `entry.<page>.js` | 前端页面入口 | 见 [页面入口](#frontend/entry.md) |

> 扫描的是 `dist` 下的 JS，不是 `app` 下的 TS。改完 TS 记得 `npm run build:modules`，`npm run dev` 会自动 watch。

## 业务仓库推荐结构

```text
my-app/
├── app/
│   ├── modules/
│   │   ├── product/
│   │   │   ├── dto/
│   │   │   ├── product.controller.ts
│   │   │   ├── product.service.ts
│   │   │   └── product.module.ts
│   │   └── auth/
│   ├── pages/
│   │   ├── project-list/entry.project-list.js
│   │   ├── dashboard/
│   │   │   ├── router.js                          # 扩展 dashboard 路由
│   │   │   └── complex-view/schema-view/components/
│   │   │       └── component-config.js            # 扩展动态组件
│   │   └── widgets/
│   │       ├── schema-form/form-item-config.js    # 扩展表单控件
│   │       ├── schema-search-bar/search-item-config.js
│   │       └── header-container/header-config.js  # 扩展头部区域
│   ├── agents/
│   ├── skills/
│   ├── prompts/
│   ├── llm-providers/
│   ├── rag/
│   └── eval/
├── config/
├── model/
├── server.js
└── build.js
```

## 框架仓库结构

```text
elpis/
├── app/
│   ├── main.ts              # Nest bootstrap：全局 Pipe / Guard / Interceptor / Filter
│   ├── app.module.ts        # 动态加载业务模块
│   ├── common/              # BaseController、DTO、全局中间层
│   ├── config/              # ConfigService
│   ├── extend/              # DatabaseProvider、LoggerProvider
│   ├── modules/             # 内置 project / view 模块
│   ├── ai/                  # Agent 运行时（llm/agent/skill/tool/mcp/rag/memory/...）
│   ├── pages/               # 前端通用页面与 widgets
│   └── vite/                # 前端构建（dev / prod）
├── config/config.default.js # 框架默认配置
├── model/index.js           # model / project 解析与继承
├── index.js                 # serverStart / frontendBuild
└── nest.js                  # @fsiaonma/elpis/nest 公共导出
```

## 公共导出

```ts
// 服务端运行时
import {
  BaseController,
  ConfigService,
  DatabaseProvider,
  ExtendModule,
  RagModule,
  RetrieverService,
  runAssertions,
} from '@fsiaonma/elpis/nest';

// 类型
import type {
  AgentDefinition,
  SkillDefinition,
  SkillContext,
  LlmProvider,
  LlmMessage,
  LlmChatOptions,
  EmbeddingProvider,
  RunResult,
  Step,
  AgentStreamEvent,
} from '@fsiaonma/elpis';
```

```js
// 启动与构建
const { serverStart, frontendBuild } = require('@fsiaonma/elpis');
```
