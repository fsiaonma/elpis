<template>
	<el-drawer
		v-model="isShow"
		direction="rtl"
		:destroy-on-close="true"
		:size="550"
	>
		<template #header>
			<h3>{{title}}</h3>
		</template>
		<template #default>
			<schema-form
				ref="schemaFormRef"
				v-loading="loading"
				:schema="components[name]?.schema"
				:model="dtoModel"
			></schema-form>
		</template>
		<template #footer>
			<el-button
				type="primary"
				@click="save"
			>{{saveBtnText}}</el-button>
		</template>
	</el-drawer>
</template>

<script setup>
import { ref, inject } from 'vue';
import { ElNotification } from 'element-plus';
import $curl from '$elpisCommon/curl';
import SchemaForm from '$elpisWidgets/schema-form/schema-form';

const {
	api,
	components
} = inject('schemaViewData');

const emit = defineEmits([ 'command' ]);

const name = ref('editForm');

const schemaFormRef = ref(null);
const isShow = ref(false);
const loading = ref(false);
const title = ref('');
const saveBtnText = ref('');
const mainKey = ref('');
const mainValue = ref();
const dtoModel = ref({});

const show = (rowData) => {
	const { config } = components.value[name.value];

	title.value = config.title;
	saveBtnText.value = config.saveBtnText;
	mainKey.value = config.mainKey; // 表单主键
	mainValue.value = rowData[config.mainKey]; // 表单主键值
	dtoModel.value = {};

	isShow.value = true;

	fetchFormData(); 
}

const close = () => {
	isShow.value = false;
}

const fetchFormData = async () => {
	if (loading.value) { return; }

	loading.value = true;
	const res = await $curl({
		method: 'get',
		url: api.value,
		query: {
			[mainKey.value]: mainValue.value
		}
	});
	loading.value = false;

	if (!res || !res.success || !res.data) {
		return;
	}

	dtoModel.value = res.data;
}

const save = async () => {
	if (loading.value) { return; }

	if (!schemaFormRef.value.validate()) { return; }

	loading.value = true;
	const res = await $curl({
		method: 'put',
		url: api.value,
		data: {
			[mainKey.value]: mainValue.value,
			...schemaFormRef.value.getValue()
		}
	})
	loading.value = false;

	if (!res || !res.success) {
		return;
	}

	ElNotification({
		title: '修改成功',
		message: '修改成功',
		type: 'success'
	});

	close();

	emit('command', {
		event: 'loadTableData'
	});
}

defineExpose({
	name,
	show
});
</script>

<style lang="less" scoped></style>