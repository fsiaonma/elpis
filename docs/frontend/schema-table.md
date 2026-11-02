# schema-table

基于 `el-table` + `el-pagination` 的配置化表格，自动分页请求 `{api}/list`。在 schema-view 中由 `tableOption` 驱动，也可以单独使用。

## 单独使用

```vue
<template>
  <schema-table
    ref="tableRef"
    :schema="schema"
    api="/api/proj/product"
    :apiParmas="{ status: 1 }"
    :buttons="buttons"
    @operate="onOperate"
  />
</template>

<script setup>
import { ref } from 'vue';
import SchemaTable from '$elpisSchemaTable';

const tableRef = ref(null);

const schema = {
  type: 'object',
  properties: {
    product_id: { type: 'string', label: 'ID', option: { width: 120 } },
    product_name: { type: 'string', label: '名称', option: { 'show-overflow-tooltip': true } },
    price: { type: 'number', label: '价格', option: { toFixed: 2, sortable: true } },
    secret: { type: 'string', label: '内部字段', option: { visible: false } },
  },
};

const buttons = [
  { label: '编辑', eventKey: 'edit', type: 'primary' },
  { label: '下架', eventKey: 'offline', type: 'danger' },
];

const onOperate = ({ btnConfig, rowData }) => {
  if (btnConfig.eventKey === 'edit') { /* ... */ }
};

// 外部刷新
const refresh = () => tableRef.value.loadTableData();
</script>
```

> 单独使用时字段配置写在 `option` 中；在 schema-view 中写在 `tableOption`，框架会自动转换。

## Props

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `schema` | `Object` | `{ type: 'object', properties: { key: { type, label, option } } }` |
| `api` | `String` | 数据源前缀，实际请求 `GET ${api}/list` |
| `apiParmas` | `Object` | 额外请求参数（注意拼写为 `apiParmas`），变化时自动重新加载 |
| `buttons` | `Array` | 操作列按钮 `[{ label, eventKey, eventOption, ...elButtonProps }]` |

## 字段 option

| 字段 | 说明 |
| --- | --- |
| 任意 `el-table-column` 属性 | `width`、`fixed`、`sortable`、`show-overflow-tooltip` 等透传 |
| `visible` | `false` 时不显示该列 |
| `toFixed` | 数字保留小数位 |

## 请求与响应

```text
GET {api}/list?page=1&size=50&...apiParmas
```

```json
{
  "success": true,
  "data": [{ "product_id": "1", "product_name": "Elpis", "price": 39.9 }],
  "metadata": { "total": 1 }
}
```

- 默认 `page=1`、`size=50`，可选每页 `10 / 20 / 50 / 100 / 200`
- `data` 必须是数组；`metadata.total` 用于分页
- `schema`、`api`、`apiParmas` 任一变化都会回到第一页重新加载

## Events

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `operate` | `{ btnConfig, rowData }` | 点击操作列按钮 |

操作列宽度按按钮文字长度自动计算。

## 暴露方法

| 方法 | 说明 |
| --- | --- |
| `initData()` | 重置到第一页并加载 |
| `loadTableData()` | 按当前页码重新加载（100ms 防抖） |
| `showLoading()` / `hideLoading()` | 控制 loading |
