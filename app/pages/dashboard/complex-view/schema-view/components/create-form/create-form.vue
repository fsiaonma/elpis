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
import $curl from '$elpisCommon/curl.js';
import SchemaForm from '$elpisWidgets/schema-form/schema-form.vue';

const {
	api,
	components
} = inject('schemaViewData');

const emit = defineEmits([ 'command' ]);

const name = ref('createForm');

const schemaFormRef = ref(null);
const isShow = ref(false);
const loading = ref(false);
const title = ref('');
const saveBtnText = ref('');

const show = () => {
	const { config } = components.value[name.value];

	title.value = config.title;
	saveBtnText.value = config.saveBtnText;

	isShow.value = true;
}

const close = () => {
	isShow.value = false;
}

const save = async () => {
	if (loading.value) { return; }

	if (!schemaFormRef.value.validate()) { return; }

	loading.value = true;
	const res = await $curl({
		method: 'post',
		url: api.value,
		data: {
			...schemaFormRef.value.getValue()
		}
	});
	loading.value = false;

	if (!res || !res.success) {
		return;
	}

	ElNotification({
		title: '创建成功',
		message: '创建成功',
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