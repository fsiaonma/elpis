# schema-form

配置化表单，使用 [Ajv](https://ajv.js.org/) 按 JSON Schema 校验。schema-view 的新增 / 编辑抽屉就是它，分别由 `createFormOption`、`editFormOption` 驱动。

## 内置控件

| comType | 组件 |
| --- | --- |
| `input` | `el-input` |
| `inputNumber` | `el-input-number` |
| `select` | `el-select`，选项来自 `option.enumList` |

## 字段 option

| 字段 | 说明 |
| --- | --- |
| `comType` | 控件类型 |
| `required` | 必填（也可以写在 schema 的 `required` 数组中） |
| `visible` | `false` 时隐藏但仍参与取值 |
| `disabled` | 禁用 |
| `default` | 默认值（无 model 值时使用） |
| `enumList` | `select` 选项 `[{ label, value }]` |
| 其他 | 透传给对应 `el-*` 组件，例如 `placeholder`、`min`、`max` |

## 校验

字段上的标准 JSON Schema 约束会生效：

```js
username: {
  type: 'string',
  label: '用户名',
  minLength: 3,
  maxLength: 16,
  pattern: '^[a-z0-9_]+$',
  createFormOption: { comType: 'input' },
},
age: {
  type: 'number',
  label: '年龄',
  minimum: 18,
  maximum: 60,
  createFormOption: { comType: 'inputNumber' },
},
```

- 失焦时校验单个字段，提交时 `validate()` 校验全部
- 提示文案：`不能为空`、`类型必须为 xxx`、`最大长度应为 n`、`最小长度应为 n`、`格式不正确`
- `input` 的 placeholder 会自动展示约束，例如 `最小长度: 3|最大长度: 16`

## 单独使用

```vue
<template>
  <schema-form ref="formRef" :schema="schema" :model="model" />
  <el-button type="primary" @click="submit">提交</el-button>
</template>

<script setup>
import { ref } from 'vue';
import SchemaForm from '$elpisSchemaForm';
import $curl from '$elpisCurl';

const formRef = ref(null);
const model = ref({ nickname: 'elpis' }); // 回填值

const schema = {
  type: 'object',
  properties: {
    nickname: {
      type: 'string',
      label: '昵称',
      maxLength: 10,
      option: { comType: 'input', required: true },
    },
    sex: {
      type: 'number',
      label: '性别',
      option: {
        comType: 'select',
        enumList: [{ label: '男', value: 1 }, { label: '女', value: 2 }],
      },
    },
  },
};

const submit = async () => {
  if (!formRef.value.validate()) return;
  await $curl({ method: 'post', url: '/api/user', data: formRef.value.getValue() });
};
</script>
```

| Props | 说明 |
| --- | --- |
| `schema` | 表单 schema，字段配置在 `option` |
| `model` | 初始值对象，按字段名回填 |

| 暴露方法 | 说明 |
| --- | --- |
| `validate()` | 全部通过返回 `true` |
| `getValue()` | 合并所有控件的值，未填写的字段不会出现 |

## 自定义表单控件

以多行文本 `textarea` 为例。

**1. 注册**

```js
// app/pages/widgets/schema-form/form-item-config.js
import textarea from './complex-view/textarea/textarea.vue';

export default {
  textarea: { component: textarea },
};
```

**2. 实现控件**

控件契约：

| 契约 | 说明 |
| --- | --- |
| props `schemaKey` | 字段名 |
| props `schema` | 字段 schema（含 `option`） |
| props `model` | 回填值 |
| `inject('ajv')` | 表单提供的 Ajv 实例 |
| expose `validate()` | 返回 `boolean` |
| expose `getValue()` | 返回 `{ [schemaKey]: value }`，空值返回 `{}` |

```vue
<template>
  <el-row type="flex" align="middle" class="form-item">
    <el-row class="item-label" justify="end">
      <el-row v-if="schema.option?.required" class="required">*</el-row>
      {{ schema.label }}
    </el-row>
    <el-row class="item-value">
      <el-input
        v-model="dtoValue"
        type="textarea"
        :rows="schema.option?.rows ?? 4"
        v-bind="schema.option"
        @blur="validate"
      />
    </el-row>
    <el-row v-if="validTips" class="valid-tips">{{ validTips }}</el-row>
  </el-row>
</template>

<script setup>
import { ref, toRefs, watch, inject, onMounted } from 'vue';

const ajv = inject('ajv');
const props = defineProps({ schemaKey: String, schema: Object, model: String });
const { schemaKey, schema } = props;
const { model } = toRefs(props);

const dtoValue = ref();
const validTips = ref(null);

const init = () => {
  dtoValue.value = model.value ?? schema.option?.default;
  validTips.value = null;
};
onMounted(init);
watch([model], init);

const validate = () => {
  validTips.value = null;
  if (schema.option?.required && !dtoValue.value) {
    validTips.value = '不能为空';
    return false;
  }
  if (dtoValue.value) {
    const check = ajv.compile(schema);
    if (!check(dtoValue.value)) {
      validTips.value = '不符合要求';
      return false;
    }
  }
  return true;
};

const getValue = () => (dtoValue.value !== undefined ? { [schemaKey]: dtoValue.value } : {});

defineExpose({ validate, getValue });
</script>
```

**3. 使用**

```js
desc: {
  type: 'string',
  label: '简介',
  maxLength: 200,
  createFormOption: { comType: 'textarea', rows: 6 },
  editFormOption: { comType: 'textarea' },
},
```
