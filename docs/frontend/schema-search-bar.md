# schema-search-bar

配置化搜索栏。在 schema-view 中由字段的 `searchOption` 驱动，搜索结果作为 `apiParmas` 传给表格。

## 内置控件

| comType | 说明 | 输出 |
| --- | --- | --- |
| `input` | 输入框 | `{ [key]: value }` |
| `select` | 下拉，选项来自 `enumList` | `{ [key]: value }` |
| `dynamicSelect` | 下拉，选项来自接口 `option.api` | `{ [key]: value }` |
| `dateRange` | 日期范围 | `{ [key]_start: 'YYYY-MM-DD', [key]_end: 'YYYY-MM-DD' }` |

所有 `el-*` 组件属性都可以直接写在 option 中透传，例如 `placeholder`、`clearable`。

## 配置示例

```js
properties: {
  keyword: {
    type: 'string',
    label: '关键词',
    searchOption: { comType: 'input', placeholder: '名称 / ID', clearable: true },
  },
  status: {
    type: 'number',
    label: '状态',
    searchOption: {
      comType: 'select',
      default: 1,
      enumList: [
        { label: '上架', value: 1 },
        { label: '下架', value: 0 },
      ],
    },
  },
  category: {
    type: 'string',
    label: '分类',
    searchOption: { comType: 'dynamicSelect', api: '/api/proj/category/enum' },
  },
  create_time: {
    type: 'string',
    label: '创建时间',
    searchOption: { comType: 'dateRange' },
  },
}
```

请求会变为：

```text
GET /api/proj/product/list?keyword=x&status=1&category=a&create_time_start=2026-01-01&create_time_end=2026-01-31&page=1&size=50
```

### dynamicSelect 接口

```text
GET {option.api}
```

```json
{ "success": true, "data": [{ "label": "全部", "value": "all" }, { "label": "图书", "value": "book" }] }
```

默认选中 `option.default`，没有则选中第一项。

## 默认值

- `option.default` 作为初始值，「重置」时也恢复为它
- schema-view 中 URL query 同名参数会覆盖 `default`

## 单独使用

```vue
<template>
  <schema-search-bar
    ref="barRef"
    :schema="schema"
    @load="onSearch"
    @search="onSearch"
    @reset="onSearch({})"
  />
</template>

<script setup>
import SchemaSearchBar from '$elpisSchemaSearchBar';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', label: '名称', option: { comType: 'input' } },
  },
};

const onSearch = (params) => {
  console.log(params);
};
</script>
```

| 事件 | 说明 |
| --- | --- |
| `load` | 所有控件就绪（例如 dynamicSelect 拉到选项）后触发一次，带初始值 |
| `search` | 点击「搜索」 |
| `reset` | 点击「重置」 |

暴露方法：`getValue()`、`reset()`。

## 自定义搜索控件

在业务仓库创建 `app/pages/widgets/schema-search-bar/search-item-config.js`：

```js
import cascader from './complex-view/cascader/cascader.vue';

export default {
  cascader: { component: cascader },
};
```

控件需满足以下契约：

| 契约 | 说明 |
| --- | --- |
| props `schemaKey` | 字段名 |
| props `schema` | 字段 schema，配置在 `schema.option` |
| emit `loaded` | 初始化完成后必须触发一次，否则搜索栏不会触发 `load` |
| expose `getValue()` | 返回要合并进请求参数的对象 |
| expose `reset()` | 恢复默认值 |

```vue
<template>
  <el-cascader v-model="dtoValue" v-bind="schema.option" :options="schema.option?.options" />
</template>

<script setup>
import { ref, onMounted } from 'vue';

const { schemaKey, schema } = defineProps({ schemaKey: String, schema: Object });
const emit = defineEmits(['loaded']);

const dtoValue = ref();

const getValue = () => (dtoValue.value?.length ? { [schemaKey]: dtoValue.value.at(-1) } : {});
const reset = () => { dtoValue.value = schema.option?.default; };

onMounted(() => {
  reset();
  emit('loaded');
});

defineExpose({ getValue, reset });
</script>
```

使用：`searchOption: { comType: 'cascader', options: [...] }`。
