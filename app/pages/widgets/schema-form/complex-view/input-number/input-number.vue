<template>
	<el-row type="flex" align="middle" class="form-item">
		<!-- label -->
		<el-row class="item-label" justify="end">
			<el-row
				v-if="schema.option?.required"
				type="flex"
				class="required"
			>*</el-row>
			{{schema.label}}
		</el-row>
		<!-- value -->
		<el-row class="item-value">
			<el-input-number
				v-model="dtoValue"
				v-bind="schema.option"
				:controls="false"
				:placeholder="placeholder"
				class="component"
				:class="validTips ? 'valid-border' : ''"
				@focus="onFocus"
				@blur="onBlur"
			></el-input-number>
		</el-row>
		<!-- 错误信息 -->
		<el-row v-if="validTips" class="valid-tips">
			{{ validTips }}
		</el-row>
	</el-row>
</template>

<script setup>
import { ref, toRefs, watch, inject, onMounted } from 'vue';
const ajv = inject('ajv');

const props = defineProps({
	schemaKey: String,
	schema: Object,
	model: Number
});
const { schemaKey, schema } = props;
const { model } = toRefs(props);  

const name = ref('inputNumber');
const dtoValue = ref();
const placeholder = ref('');
const validTips = ref(null);

const initData = () => {
	dtoValue.value = model.value ?? schema.option?.default;
	validTips.value = null;

	const { 
		minimum,
		maximum
	} = schema;

	const ruleList = [];
	if (schema.option?.placeholder) {
		ruleList.push(schema.option.placeholder);
	}
	if (minimum !== undefined) {
		ruleList.push(`最小值: ${minimum}`);
	}
	if (maximum !== undefined) {
		ruleList.push(`最大值: ${maximum}`);
	}
	placeholder.value = ruleList.join('|');	
}

onMounted(() => {
	initData();
});

watch([ model, schema ], () => {
	initData();
}, { deep: true });

const validate = () => {
	validTips.value = null;

	const { type } = schema;

	// 校验是否必填
	if (schema.option?.required && !dtoValue.value) {
		validTips.value = '不能为空';
		return false;
	}

	// ajv 校验 schema
	if (dtoValue.value) {
		const validate = ajv.compile(schema);
		const valid = validate(dtoValue.value);
		if (!valid && validate.errors && validate.errors[0]) {
			const { keyword, params } = validate.errors[0];
			if (keyword === 'type') {
				validTips.value = `类型必须为 ${type}`;
			} else if (keyword === 'minimum') {
				validTips.value = `最小值应为 ${params.limit}`;
			} else if (keyword === 'maximum') {
				validTips.value = `最大值应为 ${params.limit}`;
			} else {
				console.log(validate.errors[0]);
				validTips.value = '不符合要求';
			}
			return false;
		}
	}

	return true;
}

const getValue = () => {
	return dtoValue.value !== undefined ? {
		[schemaKey]: dtoValue.value
	} : {}
}

const onFocus = () => {
	validTips.value = null;
}

const onBlur = () => {
	validate();
}

defineExpose({
	name,
	validate,
	getValue
});
</script>

<style lang="less" scoped>
:deep(.el-input-number .el-input__inner) {
	text-align: left;
}
</style>