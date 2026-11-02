# 开发与部署

## 本地开发

```bash
# 前端：启动 Vite dev server（127.0.0.1:9002，支持 HMR），保持运行
npm run build:dev

# 服务端：tsc watch + nodemon
npm run dev
```

开发模式下，框架会为每个 `entry.<page>.js` 在业务仓库的 `app/public/dist/` 写入 `entry.<page>.tpl`，模板里的脚本指向 Vite dev server，因此改页面代码无需重启服务。

`npm run dev` 做了三件事：

1. `tsc -p tsconfig.json` 先完整编译一次业务 TS 到 `dist/`
2. `tsc -w` 持续监听
3. `nodemon --watch dist/modules` 在模块产物变化时重启服务（`_ENV=local`）

> 只改 `agents/`、`skills/`、`prompts/` 时 nodemon 默认不重启，如需热更新可把对应 `dist` 目录加入 `--watch`。

## 联调框架源码

```bash
# elpis 框架
npm run build:watch      # nest build --watch
npm link

# 业务仓库
npm link @fsiaonma/elpis
npm run dev
```

取消联调：

```bash
npm unlink @fsiaonma/elpis && npm install
```

## 生产构建与启动

```bash
npm run build:prod       # 前端生产构建，模板写入 app/public/dist，静态资源以 /dist/prod/ 为前缀
npm run prod             # 编译业务 TS 后以 _ENV=production 启动
```

`_ENV=production` 时：

- 读取 `config/config.prod.js`
- 日志由 log4js 输出到控制台与 `./logs/application.log`（按天切分）
- 未捕获异常统一返回 `50000 网络异常 请稍后重试`

## 预发环境

```bash
_ENV='beta' PORT=8081 node ./server.js
```

## 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 接口返回 `445 请求不合法` | 未带签名或时间戳超过 10 分钟 | 用 `$curl` 调用，或加入 `apiSignVerify.whiteList` |
| 接口返回 `446` | `/api/proj/*` 缺少 `proj_key` 头 | 页面 URL 带上 `proj_key`，或手动传 header |
| 新模块不生效 | 文件名不是 `*.module.ts` 或类名不以 `Module` 结尾 | 按约定命名并重新编译 |
| 装饰器 / DTO 校验不生效 | `npm link` 后 Nest 包有两份 | 配置 `tsconfig.paths` 指向框架那一份 |
| Agent 报 `apiKey` 错误 | 使用了占位值 `xxxx` | 在配置中填入真实 key |
