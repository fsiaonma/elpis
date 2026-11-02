# 配置

## 合并顺序

配置按下面顺序深度合并，后者覆盖前者（数组整体替换）：

1. 框架 `elpis/config/config.default.js`
2. 业务 `config/config.default.js`
3. 业务环境配置，由环境变量 `_ENV` 决定：

| `_ENV` | 文件 |
| --- | --- |
| `local` | `config/config.local.js` |
| `beta` | `config/config.beta.js` |
| `production` | `config/config.prod.js` |

4. `serverStart(options)` 传入的 `name`、`homePage`

## 读取配置

在任何 Provider 中注入 `ConfigService`：

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@fsiaonma/elpis/nest';

@Injectable()
export class PayService {
  constructor(private readonly config: ConfigService) {}

  getGateway() {
    // 支持点路径
    const url = this.config.get('pay.gateway') as string;
    const env = this.config.isProduction() ? 'prod' : 'test';
    return { url, env };
  }
}
```

| 方法 | 说明 |
| --- | --- |
| `get(key)` | 读取配置，支持 `a.b.c` 点路径 |
| `isLocal()` / `isBeta()` / `isProduction()` | 判断当前 `_ENV` |
| `getBootstrapOptions()` | 读取 `serverStart` 传入的原始 options |

## 完整配置参考

```js
module.exports = {
  name: 'my-app',

  // 数据库（knex 配置，不配则 DatabaseProvider.db 为 undefined）
  db: {
    client: 'mysql2',
    connection: {
      host: 'localhost',
      port: '3306',
      database: 'my_db',
      user: 'root',
      password: 'your-password',
    },
    pool: { min: 5, max: 20 },
  },

  // 接口签名白名单
  apiSignVerify: {
    whiteList: ['/api/auth/logout'],
  },

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
    embedding: { default: 'qwen', models: { /* 同 llm */ } },
    runtime: { maxIterations: 5, maxDelegationDepth: 2 },
    agent: { threadEnabled: true },
    store: {
      trace: './data/trace',
      vector: { driver: 'file', path: './data/vector' },
      memory: { driver: 'file', path: './data/memory', maxTurns: 20 },
    },
    rag: {
      chunk: { size: 800, overlap: 100 },
      topK: 5,
      tool: { name: 'retrieve', description: '从私有知识库检索' },
    },
    mcp: { enabled: true, servers: [] },
    guardrail: { blockedKeywords: [], blockedPatterns: [] },
    eval: {
      casesGlob: 'dist/eval/*.cases.js',
      reportPath: './data/eval/report.json',
      apiBase: 'http://localhost:8080/api/ai',
    },
  },
};
```

各 AI 配置项的含义见 [LLM 接入](#ai/llm.md)、[RAG](#ai/rag.md)、[MCP](#ai/mcp.md) 等章节。

> apiKey、数据库密码等敏感信息不要提交到仓库，推荐写在 `config.local.js`（加入 `.gitignore`）或通过 `process.env` 读取。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `_ENV` | — | `local` / `beta` / `production`，决定配置文件与前端构建模式 |
| `PORT` | `8080` | 服务端口 |
| `IP` | `0.0.0.0` | 监听地址 |
