# 扩展点总览

框架在构建时检查业务仓库是否存在以下文件，存在就合并进框架，不存在则使用空模块。**只需在约定路径创建文件，不需要改任何配置。**

| 业务文件路径 | 别名 | 作用 | 文档 |
| --- | --- | --- | --- |
| `app/pages/dashboard/router.js` | `$businessDashboardRouterConfig` | 给 dashboard 添加路由（custom 页面） | [菜单与视图](#frontend/menu.md) |
| `app/pages/dashboard/complex-view/schema-view/components/component-config.js` | `$businessComponentConfig` | 注册 schema-view 动态组件 | [动态组件](#frontend/components.md) |
| `app/pages/widgets/schema-form/form-item-config.js` | `$businessFormItemConfig` | 注册表单控件 | [schema-form](#frontend/schema-form.md) |
| `app/pages/widgets/schema-search-bar/search-item-config.js` | `$businessSearchItemConfig` | 注册搜索控件 | [schema-search-bar](#frontend/schema-search-bar.md) |
| `app/pages/widgets/header-container/header-config.js` | `$bussinessHeaderConfig` | 头部右上角区域（用户面板） | 见下文 |
| `app/pages/**/entry.*.js` | — | 新增或覆盖页面入口 | [页面入口](#frontend/entry.md) |

> 新增或删除扩展文件后需要重启前端构建（`npm run build:dev`），别名在启动时解析。

## router.js

```js
export default ({ routes, siderRoutes }) => {
  routes.push({ path: '/view/dashboard/agent', component: () => import('./agent/agent.vue') });
  routes.push({ path: '/view/dashboard/trace', component: () => import('./trace/trace.vue') });
  siderRoutes.push({ path: 'todo', component: () => import('./todo/todo.vue') });
};
```

## component-config.js

```js
import uploadForm from './upload-form/upload-form.vue';

export default {
  uploadForm: { component: uploadForm },
};
```

## form-item-config.js

```js
import textarea from './complex-view/textarea/textarea.vue';

export default {
  textarea: { component: textarea },
};
```

## search-item-config.js

```js
import cascader from './complex-view/cascader/cascader.vue';

export default {
  cascader: { component: cascader },
};
```

## header-config.js：用户面板

```js
import userPanel from './complex-view/user-panel/user-panel.vue';

export default {
  userPanel: { component: userPanel },
};
```

```vue
<!-- complex-view/user-panel/user-panel.vue -->
<template>
  <el-dropdown @command="onCommand">
    <span class="user">
      <el-avatar :size="28" src="/static/avatar.png" /> {{ nickname }}
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="logout">退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import $curl from '$elpisCurl';

const nickname = ref('');

onMounted(async () => {
  const res = await $curl({ method: 'get', url: '/api/user/me' });
  if (res?.success) nickname.value = res.data.nickname;
});

const onCommand = async (cmd) => {
  if (cmd === 'logout') {
    await $curl({ method: 'post', url: '/api/auth/logout' });
    location.href = '/view/auth/login';
  }
};
</script>
```

## 覆盖内置实现

注册表都是 `{ ...框架内置, ...业务扩展 }`，因此：

- 在 `form-item-config.js` 中注册 `input` 会替换内置输入框
- 在 `component-config.js` 中注册 `createForm` 会替换内置新增抽屉
- 业务 `entry.dashboard.js` 会替换整个 dashboard 入口（一般不推荐）
