<template>
	<el-card class="table-panel">
		<!-- operation-panel -->
		<el-row
			v-if="tableConfig?.headerButtons?.length > 0"
			justify="end"
			class="operation-panel"
		>
			<el-button
				v-for="item in tableConfig?.headerButtons"
				v-bind="item"
				@click="operationHandler({ btnConfig: item })"
			>{{item.label}}</el-button>
		</el-row>
		<!-- schema-tabel（组件 widget） -->
		<schema-table
			ref="schemaTabelRef"
			:schema="tableSchema"
			:api="api"
			:apiParmas="apiParmas"
			:buttons="tableConfig?.rowButtons ?? []"
			@operate="operationHandler"
		></schema-table>
	</el-card>
</template>

<script setup>
import { ref, inject } from 'vue';
import { ElMessageBox, ElNotification } from 'element-plus';
import $curl from '$elpisCommon/curl.js';
import SchemaTable from '$elpisWidgets/schema-table/schema-table.vue';

const emit = defineEmits([ 'operate' ]);

const {
	api,
	apiParmas,
	tableSchema,
	tableConfig
} = inject('schemaViewData');

const schemaTabelRef = ref(null);

const EventHandlerMap = {
	remove: removeData
}
const operationHandler = ({ btnConfig, rowData }) => {
	const { eventKey } = btnConfig;
	if (EventHandlerMap[eventKey]) {
		EventHandlerMap[eventKey]({ btnConfig, rowData });
	} else {
		emit('operate', { btnConfig, rowData })
	}
}
function removeData({ btnConfig, rowData }) {
	const { eventOption } = btnConfig;
	if (!eventOption?.params) { return; }

	const { params } = eventOption;

	const removeKey = Object.keys(params)[0];

	let removeValue;
	const removeValueList = params[removeKey].split('::');
	if (removeValueList[0] === 'schema' && removeValueList[1]) {
		removeValue = rowData[removeValueList[1]];
	}

	ElMessageBox.confirm(
		`确认删除 ${removeKey} 为：${removeValue} 数据？`,
		'Warning',
		{
			confirmButtonText: '确认',
			cancelButtonText: '取消',
			type: 'warning'
		}
	).then(async () => {
		schemaTabelRef.value.showLoading();
		const res = await $curl({
			method: 'delete',
			url: api.value,
			data: {
				[removeKey]: removeValue
			},
			errorMessage: '删除失败'
		});
		schemaTabelRef.value.hideLoading();

		if (!res || !res.success || !res.data) {
			return;
		}

		ElNotification({
			title: '删除成功',
			message: '删除成功',
			type: 'success'
		});

		await initTableData();
	});
}

const initTableData = async () => {
	await schemaTabelRef.value.initData();
}

const loadTableData = async () => {
	await schemaTabelRef.value.loadTableData();
}

defineExpose({
	loadTableData
})
</script>

<style lang="less" scoped>
.table-panel {
	flex: 1;
	margin: 10px;
	.operation-panel {
		margin-bottom: 10px;
	}
}

:deep(.el-card__body) {
	height: 98%;
	display: flex;
	flex-direction: column;
}
</style>