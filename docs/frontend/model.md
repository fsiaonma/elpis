# model 与 project

<img src="assets/model-inherit.svg" alt="model 与 project 继承" />

`model/` 目录描述**中后台系统长什么样**：有哪些菜单、每个菜单是什么页面、表格和表单有哪些字段。

- **model**：一类系统的模板，例如「电商系统」
- **project**：基于 model 的具体项目，例如「京东」「淘宝」，可以覆盖或追加配置

## 目录

```text
model/
├── business/
│   ├── model.js          # 电商模板
│   └── project/
│       ├── jd.js         # proj_key = jd
│       ├── taobao.js
│       └── pdd.js
└── course/
    ├── model.js
    └── project/
        └── bilibili.js
```

- 目录名即 `modelKey`，project 文件名即 `projKey`，框架会自动注入 `key` / `modelKey`
- 访问 `/view/dashboard/schema?proj_key=jd&key=product` 就会加载 jd 项目的 `product` 菜单

## model.js

```js
module.exports = {
  model: 'dashboard',          // 使用 dashboard 页面渲染
  name: '电商系统',
  desc: '通用电商后台模板',
  menu: [
    {
      key: 'product',
      name: '商品管理',
      menuType: 'module',
      moduleType: 'schema',
      schemaConfig: { /* 见 schema-view */ },
    },
    {
      key: 'order',
      name: '订单管理',
      menuType: 'module',
      moduleType: 'custom',
      customConfig: { path: '/todo' },
    },
  ],
};
```

## project/jd.js

```js
module.exports = {
  name: '京东',
  desc: '京东电商系统',
  homePage: '/schema?proj_key=jd&key=product',
  menu: [
    // model 有 product，这里只改名字 → 覆盖
    { key: 'product', name: '商品管理（京东）' },
    // model 没有 shop-setting → 新增
    {
      key: 'shop-setting',
      name: '店铺设置',
      menuType: 'group',
      subMenu: [
        {
          key: 'info-setting',
          name: '店铺信息',
          menuType: 'module',
          moduleType: 'custom',
          customConfig: { path: '/todo' },
        },
      ],
    },
    // model 里的 order 没写 → 原样保留
  ],
};
```

## 继承规则

project 与 model 使用 `lodash.mergeWith` 深度合并，**数组按元素的 `key` 字段对齐**：

| 情况 | 结果 |
| --- | --- |
| project 与 model 都有同 `key` 的元素 | 递归合并，project 覆盖 |
| 只有 project 有 | 追加到数组末尾 |
| 只有 model 有 | 保留 |

所以菜单、表格按钮等数组元素都应带唯一 `key`。

## homePage

`homePage` 是项目首页，相对于 `/view/dashboard`：

```js
homePage: '/schema?proj_key=jd&key=product'
// 实际访问 /view/dashboard/schema?proj_key=jd&key=product
```

> 不要写成 `/view/dashboard/schema?...`，否则会拼出双重前缀。

## 读取配置

| 接口 | 用途 |
| --- | --- |
| `GET /api/project?proj_key=jd` | 合并后的 jd 项目配置 |
| `GET /api/project/list?proj_key=jd` | 与 jd 同 model 的项目列表（用于切换项目） |
| `GET /api/project/model_list` | 全部 model 与项目（用于项目选择页） |

一个简单的项目选择页：

```vue
<template>
  <el-card v-for="item in modelList" :key="item.model.key" :header="item.model.name">
    <el-button
      v-for="proj in item.project"
      :key="proj.key"
      @click="go(proj)"
    >{{ proj.name }}</el-button>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import $curl from '$elpisCurl';

const modelList = ref([]);

onMounted(async () => {
  const res = await $curl({ method: 'get', url: '/api/project/model_list' });
  if (res?.success) modelList.value = res.data;
});

const go = (proj) => {
  location.href = `/view/dashboard${proj.homePage}`;
};
</script>
```

下一步：[菜单与视图类型](#frontend/menu.md)
