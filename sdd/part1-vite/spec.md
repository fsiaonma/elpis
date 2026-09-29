# Part1 spec · Webpack → Vite

> 需求分析。先走完 spec → plan → tasks，再贴实现 Prompt（开头钉三件套）。本文件在 **elpis** 仓库。

## 目标

把 elpis 的前端构建器从 webpack 换成 Vite。elpis-demo 里看到的 dashboard **行为不能少**，开发体验要明显快于 1.0。

## 稳定面（合同）

- `frontendBuild(env)` 签名不变；demo `build.js` 不改
- `.tpl` 仍给服务端渲染，不是官方 `index.html`
- 双终端：9002 出脚本，8080 读页面
- 业务页 `import` 路径零改

## 禁止

- `npm create vite` / 官方单入口 SPA
- demo 里 `import vite` 或手写 Vite 配置
- 改 `frontendBuild` 的参数或返回值
- 本 Part 动 Koa / Nest / 业务 schema

## 验收（Part 结束）

- M5：9002 curl 200 + HMR 日志
- M7：8080 dashboard 全链路 CRUD
- webpack 目录与依赖已删除