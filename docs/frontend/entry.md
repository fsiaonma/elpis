# 页面入口与 boot

Elpis 前端是**多页应用**：每个 `entry.<page>.js` 是一个独立页面，通过 `/view/<page>` 访问。

## 新增一个页面

```text
app/pages/
└── project-list/
    ├── entry.project-list.js
    └── project-list.vue
```

```js
// app/pages/project-list/entry.project-list.js
import boot from '$elpisBoot';
import ProjectList from './project-list.vue';

boot(ProjectList);
```

构建后访问 `http://localhost:8080/view/project-list` 即可。

## 入口扫描规则

- 框架 `elpis/app/pages/**/entry.*.js` 与业务 `app/pages/**/entry.*.js` 一起参与构建
- 入口名取文件名（去掉 `.js`），**同名时业务覆盖框架**
- 框架内置入口：`entry.dashboard.js`（中后台主框架）

## boot(pageComponent, { routes, libs })

`boot` 帮你完成 Vue 应用的标准初始化：

1. `createApp(pageComponent)`
2. 安装 Element Plus（含暗色主题变量）
3. 安装 Pinia（`$elpisStore`）
4. 依次 `app.use(libs[i])`
5. 传了 `routes` 时创建 `createWebHistory` 路由，`router.isReady()` 后挂载到 `#root`

### 带路由的页面

```js
import boot from '$elpisBoot';
import App from './app.vue';

const routes = [
  { path: '/view/report/overview', component: () => import('./overview.vue') },
  { path: '/view/report/detail/:id', component: () => import('./detail.vue') },
];

boot(App, { routes });
```

```vue
<!-- app.vue -->
<template>
  <router-view />
</template>
```

> 路由使用 history 模式，path 必须以 `/view/<page>` 开头。服务端 `/view/:page/*` 会返回同一个模板。

### 注入第三方插件

```js
import boot from '$elpisBoot';
import MonacoEditor from 'monaco-editor-vue3';
import App from './app.vue';

boot(App, { libs: [MonacoEditor] });
```

## 页面上的全局变量

模板渲染时写入：

| 变量 | 说明 |
| --- | --- |
| `window.projKey` | URL 中的 `proj_key` |
| `window.env` | `_ENV` |
| `window.options` | `serverStart(options)`，例如 `name`、`icon`、`homePage` |

## 别名

在业务页面中通过以下别名引用框架能力：

| 别名 | 指向 |
| --- | --- |
| `$elpisBoot` | `pages/boot.js` |
| `$elpisCurl` | `pages/common/curl.js` |
| `$elpisCommon` | `pages/common` |
| `$elpisUtils` | `pages/common/utils.js` |
| `$elpisPages` | `pages` |
| `$elpisWidgets` | `pages/widgets` |
| `$elpisStore` | `pages/store`（`menu.js`、`project.js`） |
| `$elpisHeaderContainer` | 头部布局容器 |
| `$elpisSiderContainer` | 侧边栏布局容器 |
| `$elpisSchemaTable` | [schema-table](#frontend/schema-table.md) |
| `$elpisSchemaForm` | [schema-form](#frontend/schema-form.md) |
| `$elpisSchemaSearchBar` | [schema-search-bar](#frontend/schema-search-bar.md) |

```vue
<script setup>
import HeaderContainer from '$elpisHeaderContainer';
import SchemaTable from '$elpisSchemaTable';
import $curl from '$elpisCurl';
</script>
```

## 静态资源

业务 `app/public/` 下的文件直接对外提供，例如 `app/public/static/logo.png` → `/static/logo.png`。
