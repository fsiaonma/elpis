# Part1 plan · Webpack → Vite

> 技术方案。回答：怎么拆层、改哪、对照怎么做。
> 需求见 spec.md，顺序见 tasks.md。

## 改哪 / 不改哪

| 改 | 不改 |
|----|------|
| elpis `app/vite/`（新建，与 `app/webpack/` 平行） | demo `build.js` / 业务 pages / schema |
| 最后删除 `app/webpack/` 与 webpack 依赖 | `frontendBuild(env)` 对外签名 |

## 策略

- **对照迁移**：webpack 有的职责，vite 必须有对等位置，不是抄官方模板
- **先双轨后删除**：对照期两套构建器并存；删 webpack 是最后一条任务
- **框架乘数**：Vite 关在 elpis 里，所有业务项目一起升级

## 关键机制

- 扫描两棵树：框架 `pages/entry.*.js` + 业务 `cwd/app/pages/entry.*.js`，merge 后再进 `rollupOptions.input`
- alias `$elpis*` / `$business*`、`resolve.dedupe: ['vue']` 与 webpack 一字不差
- 自研 `elpis-tpl-plugin`：dev 写 9002 绝对 URL，prod 写构建产物路径
- `index.js` 按 env 分岔：`local` → `dev.js`（`vite.createServer`），`production` → `prod.js`（`vite.build`）

## 目录轮廓（实现可以微调，职责不能丢）

    app/vite/
      index.js              env 分岔（本 Part 中段才切 frontendBuild）
      dev.js / prod.js
      config/vite.base.js   入口 · alias · dedupe · 插件
      plugins/elpis-tpl-plugin.js