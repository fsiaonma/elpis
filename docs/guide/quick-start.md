# 快速开始

本页从零搭一个业务仓库，跑通「一个接口 + 一个页面 + 一个 Agent」。

> 环境要求：Node.js 18+（推荐 22），npm 9+。使用 MySQL 时需要本地数据库；不用数据库可以不配 `db`。

## 1. 安装框架

```bash
mkdir my-app && cd my-app
npm init -y
npm install @fsiaonma/elpis
npm install -D typescript @types/node nodemon concurrently
```

本地联调框架源码时，可以用 `npm link`：

```bash
# 在 elpis 框架目录
npm install && npm run build && npm link

# 在业务仓库
npm link @fsiaonma/elpis
```

> 使用 `npm link` 时，业务仓库与框架必须共用同一份 `@nestjs/*`、`class-validator`、`class-transformer`，否则装饰器元数据不互通。参考下方 `tsconfig.json` 的 `paths` 写法。

## 2. 最小目录

```text
my-app/
├── app/
│   ├── modules/            # Nest 业务模块（*.module.ts）
│   │   └── hello/
│   ├── pages/              # 前端页面（entry.*.js）
│   ├── agents/             # Agent 定义（*.agent.ts）
│   ├── skills/             # Skill 定义（*.skill.ts）
│   └── prompts/            # Prompt（*.prompt.ts）
├── config/
│   ├── config.default.js
│   └── config.local.js
├── model/                  # 中后台 schema 配置
├── server.js               # 服务端入口
├── build.js                # 前端构建入口
├── tsconfig.json
└── package.json
```

## 3. 入口文件

`server.js`：

```js
const { serverStart } = require('@fsiaonma/elpis');

serverStart({
  name: 'MyApp',
  icon: '/static/logo.png',
  homePage: '/view/project-list',
});
```

`build.js`：

```js
const { frontendBuild } = require('@fsiaonma/elpis');

// local：启动 Vite dev server（HMR）；production：生产构建
frontendBuild(process.env._ENV);
```

## 4. TypeScript 配置

框架只加载编译后的 `dist/**`，所以业务 TS 需要先编译。`rootDir` 设为 `app`，产物就会落在 `dist/modules`、`dist/agents` 等框架约定位置。

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./app",
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": [
    "app/modules/**/*.ts",
    "app/skills/**/*.ts",
    "app/agents/**/*.ts",
    "app/prompts/**/*.ts",
    "app/llm-providers/**/*.ts",
    "app/eval/**/*.ts",
    "app/rag/**/*.ts",
    "node_modules/@fsiaonma/elpis/app/types/express.d.ts"
  ]
}
```

`npm link` 联调时追加 `paths`，让 Nest 相关包指向框架那一份：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@nestjs/common": ["../elpis/node_modules/@nestjs/common"],
      "@nestjs/core": ["../elpis/node_modules/@nestjs/core"],
      "@nestjs/platform-express": ["../elpis/node_modules/@nestjs/platform-express"],
      "class-validator": ["../elpis/node_modules/class-validator"],
      "class-transformer": ["../elpis/node_modules/class-transformer"]
    }
  }
}
```

## 5. scripts

```json
{
  "scripts": {
    "build:modules": "tsc -p tsconfig.json",
    "build:modules:watch": "tsc -w -p tsconfig.json",
    "dev": "npm run build:modules && concurrently -n tsc,server \"npm run build:modules:watch\" \"_ENV='local' nodemon --watch dist/modules --delay 1 ./server.js\"",
    "build:dev": "_ENV='local' node ./build.js",
    "build:prod": "_ENV='production' node ./build.js",
    "beta": "_ENV='beta' PORT=8081 node ./server.js",
    "prod": "npm run build:modules && _ENV='production' node ./server.js"
  }
}
```

## 6. 写第一个接口

`app/modules/hello/hello.module.ts`：

```ts
import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';

@Module({ controllers: [HelloController] })
export class HelloModule {}
```

`app/modules/hello/hello.controller.ts`：

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { BaseController } from '@fsiaonma/elpis/nest';

@Controller('api/hello')
export class HelloController extends BaseController {
  @Get()
  hello(@Query('name') name = 'Elpis') {
    return this.success({ text: `Hello, ${name}` });
  }
}
```

> 所有包含 `/api` 的路径默认要求签名，浏览器里通过 `$curl` 调用会自动带上。直接用 curl 调试时，把路径加进 `apiSignVerify.whiteList`，见 [请求链路](#server/pipeline.md)。

## 7. 启动

```bash
# 终端 1：前端构建（开发模式 watch）
npm run build:dev

# 终端 2：编译 TS 并启动服务
npm run dev
```

访问 `http://localhost:8080/view/project-list`，或者访问任意已经声明的 `model` 页面。

## 下一步

- 想知道哪些目录会被自动扫描：[项目结构](#guide/structure.md)
- 写一个带增删改查的管理页：[schema-view](#frontend/schema-view.md)
- 接入大模型与 Agent：[AI 总览](#ai/overview.md)
