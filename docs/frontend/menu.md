# 菜单与视图类型

dashboard 页面读取项目配置的 `menu` 渲染顶部菜单，点击后按 `moduleType` 跳到对应视图。

## 菜单项字段

| 字段 | 说明 |
| --- | --- |
| `key` | 唯一标识，也用于 project 覆盖 model |
| `name` | 显示名 |
| `menuType` | `group`：分组（有 `subMenu`）；`module`：可点击的页面 |
| `moduleType` | `menuType: 'module'` 时必填，见下表 |
| `subMenu` | `group` 的子菜单 |
| `schemaConfig` / `iframeConfig` / `customConfig` / `siderConfig` | 对应视图的配置 |

## moduleType

| moduleType | 路由 | 配置 | 说明 |
| --- | --- | --- | --- |
| `schema` | `/view/dashboard/schema` | `schemaConfig` | 配置驱动的增删改查页，见 [schema-view](#frontend/schema-view.md) |
| `iframe` | `/view/dashboard/iframe` | `iframeConfig.path` | 内嵌外部页面 |
| `custom` | `/view/dashboard${customConfig.path}` | `customConfig.path` | 业务自定义 Vue 页面 |
| `sider` | `/view/dashboard/sider` | `siderConfig.menu` | 左侧二级菜单，内部可再放 schema / iframe / custom |

URL 中通过 `key`（顶部菜单）与 `sider_key`（侧边菜单）定位当前菜单项。

## 示例

```js
menu: [
  // 分组
  {
    key: 'shop',
    name: '店铺',
    menuType: 'group',
    subMenu: [
      {
        key: 'quality',
        name: '店铺资质',
        menuType: 'module',
        moduleType: 'iframe',
        iframeConfig: { path: 'https://example.com/quality' },
      },
    ],
  },
  // 带侧边栏
  {
    key: 'data',
    name: '数据分析',
    menuType: 'module',
    moduleType: 'sider',
    siderConfig: {
      menu: [
        {
          key: 'analysis',
          name: '电商罗盘',
          menuType: 'module',
          moduleType: 'custom',
          customConfig: { path: '/todo' },
        },
        {
          key: 'tags',
          name: '标签',
          menuType: 'module',
          moduleType: 'schema',
          schemaConfig: { api: '/api/proj/tag', schema: {} },
        },
      ],
    },
  },
]
```

## custom：接入业务页面

`custom` 菜单需要业务在 `app/pages/dashboard/router.js` 中注册路由：

```js
// app/pages/dashboard/router.js
export default ({ routes, siderRoutes }) => {
  // 顶部菜单：customConfig.path = '/todo'
  routes.push({
    path: '/view/dashboard/todo',
    component: () => import('./todo/todo.vue'),
  });

  // 侧边菜单：路径相对 /view/dashboard/sider
  siderRoutes.push({
    path: 'todo',
    component: () => import('./todo/todo.vue'),
  });
};
```

### 在自定义页面读取菜单配置

菜单项上可以放任意自定义字段，页面里通过 `menuStore` 读出来：

```js
// model：
{
  key: 'assistant',
  name: '项目助手',
  menuType: 'module',
  moduleType: 'custom',
  customConfig: { path: '/agent' },
  agentConfig: { agentName: 'project-assistant', apiBase: '/api/ai' },
}
```

```vue
<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMenuStore } from '$elpisStore/menu.js';

const route = useRoute();
const menuStore = useMenuStore();

const config = computed(() => {
  const item = menuStore.findMenuItem({
    key: 'key',
    value: route.query.sider_key ?? route.query.key,
  });
  return item?.agentConfig ?? {};
});
</script>
```

`menuStore` 提供：

| 方法 / 属性 | 说明 |
| --- | --- |
| `menuList` | 当前项目的菜单 |
| `findMenuItem({ key, value })` | 在全部层级（含 `subMenu` 与 `siderConfig.menu`）中查找 |
| `findFirstMenuItem(list)` | 找到第一个可点击的菜单 |

`useProjectStore()`（`$elpisStore/project.js`）保存同 model 的项目列表，用于头部切换项目。
