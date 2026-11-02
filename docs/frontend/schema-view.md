# schema-view：配置即页面

<img src="assets/schema-flow.svg" alt="schemaConfig 到页面" />

`moduleType: 'schema'` 的菜单由 `schema-view` 渲染。只写一份 `schemaConfig`，就能得到「搜索栏 + 分页表格 + 新增 / 编辑 / 详情抽屉 + 删除」的完整管理页。

## 结构

```js
schemaConfig: {
  api: '/api/proj/product',     // 资源接口前缀
  schema: {                     // JSON Schema + 各组件 option
    type: 'object',
    properties: { /* 字段 */ },
    required: ['product_name'],
  },
  tableConfig: {                // 表格按钮
    headerButtons: [],
    rowButtons: [],
  },
  searchConfig: {},             // 搜索栏配置（预留）
  componentConfig: {            // 动态组件
    createForm: {},
    editForm: {},
    detailPanel: {},
  },
}
```

## 字段：一个字段，多处使用

每个字段由**标准 JSON Schema** + **各组件的 `xxxOption`** 组成。哪个组件里出现这个字段，就看它有没有对应的 `xxxOption`：

```js
product_name: {
  // JSON Schema（所有组件共享，schema-form 用 Ajv 校验）
  type: 'string',
  label: '商品名称',
  minLength: 3,
  maxLength: 10,

  tableOption: { width: 200 },                    // 出现在表格
  searchOption: {                                 // 出现在搜索栏
    comType: 'dynamicSelect',
    api: '/api/proj/product_enum/list',
  },
  createFormOption: { comType: 'input', default: '新商品' }, // 出现在新增表单
  editFormOption: { comType: 'input' },           // 出现在编辑表单
  detailPanelOption: {},                          // 出现在详情面板
},
```

| option | 消费者 | 文档 |
| --- | --- | --- |
| `tableOption` | 表格列 | [schema-table](#frontend/schema-table.md) |
| `searchOption` | 搜索栏 | [schema-search-bar](#frontend/schema-search-bar.md) |
| `createFormOption` | 新增抽屉 | [schema-form](#frontend/schema-form.md) |
| `editFormOption` | 编辑抽屉 | [schema-form](#frontend/schema-form.md) |
| `detailPanelOption` | 详情抽屉 | [动态组件](#frontend/components.md) |
| `<comName>Option` | 业务自定义组件 | [动态组件](#frontend/components.md) |

`schema.required` 中的字段会自动给每个组件的 option 设置 `required: true`。

## 接口约定

以 `api: '/api/proj/product'` 为例：

| 动作 | 请求 | 参数 | 期望返回 |
| --- | --- | --- | --- |
| 表格加载 | `GET /api/proj/product/list` | 搜索值 + `page` + `size` | `data: []`，`metadata.total` |
| 编辑回填 / 详情 | `GET /api/proj/product` | `{ [mainKey]: value }` | `data: {}` |
| 新增 | `POST /api/proj/product` | 表单值 | `success: true` |
| 编辑 | `PUT /api/proj/product` | `{ [mainKey]: value, ...表单值 }` | `success: true` |
| 删除 | `DELETE /api/proj/product` | body `{ [key]: value }` | `data` 为真值 |

后端实现参考 [Module 与 Controller](#server/controller.md)。

## 完整示例

```js
{
  key: 'product',
  name: '商品管理',
  menuType: 'module',
  moduleType: 'schema',
  schemaConfig: {
    api: '/api/proj/product',
    schema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          label: '商品ID',
          tableOption: { width: 300, 'show-overflow-tooltip': true },
          editFormOption: { comType: 'input', disabled: true },
          detailPanelOption: {},
        },
        product_name: {
          type: 'string',
          label: '商品名称',
          maxLength: 10,
          minLength: 3,
          tableOption: { width: 200 },
          searchOption: { comType: 'dynamicSelect', api: '/api/proj/product_enum/list' },
          createFormOption: { comType: 'input', default: '新课程' },
          editFormOption: { comType: 'input' },
          detailPanelOption: {},
        },
        price: {
          type: 'number',
          label: '价格',
          maximum: 1000,
          minimum: 30,
          tableOption: { width: 200, toFixed: 2 },
          searchOption: {
            comType: 'select',
            enumList: [
              { label: '全部', value: -999 },
              { label: '¥39.9', value: 39.9 },
              { label: '¥199', value: 199 },
            ],
          },
          createFormOption: { comType: 'inputNumber' },
          editFormOption: { comType: 'inputNumber' },
          detailPanelOption: {},
        },
        create_time: {
          type: 'string',
          label: '创建时间',
          tableOption: {},
          searchOption: { comType: 'dateRange' },
          detailPanelOption: {},
        },
      },
      required: ['product_name'],
    },
    tableConfig: {
      headerButtons: [
        {
          label: '新增商品',
          eventKey: 'showComponent',
          eventOption: { comName: 'createForm' },
          type: 'primary',
          plain: true,
        },
      ],
      rowButtons: [
        { label: '详情', eventKey: 'showComponent', eventOption: { comName: 'detailPanel' }, type: 'primary' },
        { label: '修改', eventKey: 'showComponent', eventOption: { comName: 'editForm' }, type: 'warning' },
        {
          label: '删除',
          eventKey: 'remove',
          eventOption: { params: { product_id: 'schema::product_id' } },
          type: 'danger',
        },
      ],
    },
    componentConfig: {
      createForm: { title: '新增商品', saveBtnText: '新增商品' },
      editForm: { mainKey: 'product_id', title: '修改商品', saveBtnText: '修改商品' },
      detailPanel: { mainKey: 'product_id', title: '商品详情' },
    },
  },
}
```

## 按钮事件

| eventKey | 行为 | eventOption |
| --- | --- | --- |
| `showComponent` | 打开动态组件，调用它的 `show(rowData)` | `{ comName }` |
| `remove` | 二次确认后 `DELETE {api}`，成功后刷新表格 | `{ params: { 字段: 'schema::行字段' } }` |

`schema::product_id` 表示取当前行的 `product_id` 值。

## 通过 URL 预设搜索条件

URL query 中与搜索字段同名的参数会成为搜索栏默认值：

```text
/view/dashboard/schema?proj_key=jd&key=product&product_name=Elpis
```

## 运行流程

1. `useSchema()` 根据 `route.query.key` / `sider_key` 找到菜单项
2. `buildDtoSchema(schema, 'table' | 'search' | comName)` 从完整 schema 中挑出含 `xxxOption` 的字段，并把 option 重命名为 `option`
3. 通过 `provide('schemaViewData', { api, apiParmas, tableSchema, tableConfig, searchSchema, searchConfig, components })` 下发给子组件
4. 搜索栏 `search` 事件更新 `apiParmas`，表格自动重新请求
5. 动态组件 `emit('command', { event: 'loadTableData' })` 通知表格刷新
