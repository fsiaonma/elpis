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
			<el-select
				v-model="dtoValue"
				v-bind="schema.option"
				class="component"
				:class="validTips ? 'valid-border' : ''"
				@change="onChange"
			>
				<el-option
					v-for="item in schema.option?.enumList"
					:key="item.value"
					:label="item.label"
					:value="item.value"
				></el-option>
			</el-select>
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
	model: null
});
const { schemaKey, schema } = props;
const { model } = toRefs(props);  

const name = ref('select');
const dtoValue = ref();
const validTips = ref(null);

const initData = () => {
	dtoValue.value = model.value ?? schema.option?.default;
	validTips.value = null;
}

onMounted(() => {
	initData();
});

watch([ model, schema ], () => {
	initData();
}, { deep: true });

const validate = () => {
	validTips.value = null;

	// 校验是否必填
	if (schema.option?.required && !dtoValue.value) {
		validTips.value = '不能为空';
		return false;
	}

	// ajv 校验 schema
	if (dtoValue.value) {
		let dtoEnum = [];
		if (schema.option?.enumList) {
			dtoEnum = schema.option?.enumList.map(item => item.value);
		}
		const validate = ajv.compile({
			schema,
			... { enum: dtoEnum }
		});
		const valid = validate(dtoValue.value);
		if (!valid && validate.errors && validate.errors[0]) {
			if (validate.errors[0].keyword === 'enum') {
				validTips.value = '取值超出枚举范围';
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

const onChange = () => {
	validate();
}

defineExpose({
	name,
	validate,
	getValue
});
</script>

<style lang="less" scoped></style>