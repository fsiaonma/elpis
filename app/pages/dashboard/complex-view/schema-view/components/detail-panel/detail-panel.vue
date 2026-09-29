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
			<el-card v-loading="loading" shadow="always" class="detail-panel">
				<el-row
					v-for="(item, key) in components[name]?.schema?.properties"
					:key="key"
					type="flex"
					align="middle"
					class="row-item"
				>
					<el-row class="item-label">{{item.label}}：</el-row>
					<el-row class="item-value">{{dtoModel[key]}}</el-row>
				</el-row>
			</el-card>
		</template>
	</el-drawer>
</template>

<script setup>
import { ref, inject } from 'vue';
import $curl from '$elpisCommon/curl.js';

const {
	api,
	components
} = inject('schemaViewData');

const name = ref('detailPanel');

const isShow = ref(false);
const loading = ref(false);
const title = ref('');
const mainKey = ref('');
const mainValue = ref();
const dtoModel = ref({});

const show = (rowData) => {
	const { config } = components.value[name.value];

	title.value = config.title;
	mainKey.value = config.mainKey; // 表单主键
	mainValue.value = rowData[config.mainKey]; // 表单主键值
	dtoModel.value = {};

	isShow.value = true;

	fetchFormData();
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

defineExpose({
	name,
	show
})
</script>

<style lang="less" scoped>
.detail-panel {
	border: 1px solid #a6a6a6;
	padding: 30px;

	.row-item {
		height: 40px;
		line-height: 40px;
		font-size: 20px;

		.item-label {
			margin-right: 20px;
			width: 120px;
			color: #ffffff;
		}

		.item-value {
			color: #d2dae4;
      display: block;
      width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: break-all;
      overflow-wrap: break-word;
		}
	}
}
</style>