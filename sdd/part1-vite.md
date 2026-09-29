# Part1 · 业务仓约束（elpis-demo）

本 Part 的 spec / plan / tasks 在 **elpis** 仓库：`sdd/part1-vite/`。
Cursor 实现 Vite 时，工作区必须是 elpis，不要在本仓库写构建器。

## 本仓库禁止

- `import vite` / 新建 `vite.config.ts` / 手写 Vite 配置
- 改 `build.js`、`server.js` 的调用签名
- 改业务 pages 的 `import` 路径

## 本仓库只做

- `npm link @fsiaonma/elpis`
- 双终端：`npm run build:dev` → `:9002`，`npm run dev` → `:8080`
- 验收：dashboard 行为不能少