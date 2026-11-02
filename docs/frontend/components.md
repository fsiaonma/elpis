# 动态组件

schema-view 中由按钮 `eventKey: 'showComponent'` 打开的抽屉、弹窗等称为**动态组件**。框架内置三个，业务可以无限扩展。

## 内置组件

| comName | 作用 | 请求 | componentConfig |
| --- | --- | --- | --- |
| `createForm` | 新增抽屉 | `POST {api}` | `title`、`saveBtnText` |
| `editForm` | 编辑抽屉，先拉详情回填 | `GET {api}?{mainKey}=` → `PUT {api}` | `mainKey`、`title`、`saveBtnText` |
| `detailPanel` | 详情抽屉 | `GET {api}?{mainKey}=` | `mainKey`、`title` |

- 表单字段来自 schema 中的 `createFormOption` / `editFormOption` / `detailPanelOption`
- `mainKey` 是主键字段名，从当前行 `rowData[mainKey]` 取值
- 提交成功后自动刷新表格

```js
componentConfig: {
  createForm: { title: '新增商品', saveBtnText: '保存' },
  editForm: { mainKey: 'product_id', title: '修改商品', saveBtnText: '保存' },
  detailPanel: { mainKey: 'product_id', title: '商品详情' },
},
```

## 自定义动态组件

自定义组件需要两步：在 `componentConfig` 中声明，在业务 `component-config.js` 中注册。

### 1. 注册

```js
// app/pages/dashboard/complex-view/schema-view/components/component-config.js
import uploadForm from './upload-form/upload-form.vue';
import analyzeRedirect from './analyze-redirect/analyze-redirect.vue';

export default {
  uploadForm: { component: uploadForm },
  analyzeRedirect: { component: analyzeRedirect },
};
```

> 与内置组件同名时会覆盖内置组件，可用于整体替换 `createForm` 等的实现。

### 2. 组件契约

| 契约 | 说明 |
| --- | --- |
| expose `name` | 必须与 comName 一致 |
| expose `show(rowData)` | 按钮点击时被调用；头部按钮 `rowData` 为 `undefined` |
| emit `command` | `{ event: 'loadTableData' }` 通知表格刷新 |
| `inject('schemaViewData')` | 拿到 `api`、`components[comName].schema / config` 等 |

### 示例 1：上传抽屉

```vue
<template>
  <el-drawer v-model="isShow" :title="title" :size="550" destroy-on-close>
    <schema-form ref="formRef" :schema="components[name]?.schema" />
    <el-upload :auto-upload="false" :on-change="(f) => (file = f.raw)" />
    <template #footer>
      <el-button type="primary" :loading="loading" @click="save">上传</el-button>
    </template>
  </el-drawer>
</template>

<script setup>
import { ref, inject } from 'vue';
import axios from 'axios';
import SchemaForm from '$elpisSchemaForm';

const { api, components } = inject('schemaViewData');
const emit = defineEmits(['command']);

const name = ref('uploadForm');
const isShow = ref(false);
const loading = ref(false);
const title = ref('');
const formRef = ref(null);
let file = null;

const show = () => {
  title.value = components.value[name.value].config.title;
  isShow.value = true;
};

const save = async () => {
  if (!formRef.value.validate() || !file) return;
  loading.value = true;
  const fd = new FormData();
  fd.append('file', file);
  Object.entries(formRef.value.getValue()).forEach(([k, v]) => fd.append(k, v));
  // 上传等非 JSON 请求可自行签名，见 $curl 文档
  await axios.post(`${api.value}/upload`, fd);
  loading.value = false;
  isShow.value = false;
  emit('command', { event: 'loadTableData' });
};

defineExpose({ name, show });
</script>
```

```js
// model 中
schema: {
  properties: {
    title: { type: 'string', label: '标题', uploadFormOption: { comType: 'input' } },
  },
},
tableConfig: {
  headerButtons: [
    { label: '上传简历', eventKey: 'showComponent', eventOption: { comName: 'uploadForm' }, type: 'primary' },
  ],
},
componentConfig: {
  uploadForm: { title: '上传简历' },
},
```

### 示例 2：行按钮跳转页面

动态组件不一定要有界面，也可以只做跳转：

```vue
<script setup>
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const name = 'analyzeRedirect';

function show(rowData) {
  router.push({
    path: '/view/dashboard/resume-studio/report',
    query: { proj_key: route.query.proj_key, key: route.query.key, resumeId: rowData?.id },
  });
}

defineExpose({ name, show });
</script>
```

```js
rowButtons: [
  { label: '分析报告', eventKey: 'showComponent', eventOption: { comName: 'analyzeRedirect' } },
],
componentConfig: {
  analyzeRedirect: {},
},
```
