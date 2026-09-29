<template>
	<el-config-provider :locale="zhCn">
		<header-view :proj-name="projName" @menu-select="onMenuSelect">
			<template #main-content>
				<router-view></router-view>
			</template>
		</header-view>
	</el-config-provider>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import HeaderView from './complex-view/header-view/header-view.vue';
import $curl from '$elpisCommon/curl.js';
import { useMenuStore } from '$elpisStore/menu.js';
import { useProjectStore } from '$elpisStore/project.js';

const router = useRouter();
const route = useRoute();
const menuStore = useMenuStore();
const projectStore = useProjectStore();

onMounted(() => {
	getProjectList();
	getProjectConfig();
});

const projName = ref('');

// 请求 /api/project/list 接口，并缓存到 project-store 中
async function getProjectList() {
	const res = await $curl({
		method: 'get',
		url: '/api/project/list',
		query: {
			proj_key: route.query.proj_key,
		}
	});

	if (!res || !res.success || !res.data) {
		return;
	}

	projectStore.setProjectList(res.data);
}

// 请求 /api/project 接口，并缓存到 menu-store 中
async function getProjectConfig() {
	const res = await $curl({
		method: 'get',
		url: '/api/project',
		query: {
			proj_key: route.query.proj_key,
		}
	});

	if (!res || !res.success || !res.data) {
		return;
	}

	const { name, menu } = res.data;

	projName.value = name;

	menuStore.setMenuList(menu);
}

// 点击菜单回调方法
const onMenuSelect = function(menuItem) {
	const { moduleType, key, customConfig } = menuItem;

	// 如果是当前页面，不处理
	if (key === route.query.key) { return; }

	const pathMap = {
		sider: '/sider',
		iframe: '/iframe',
		schema: '/schema',
		custom: customConfig?.path
	}

	router.push({
		path: `/view/dashboard${pathMap[moduleType]}`,
		query: {
			key,
			proj_key: route.query.proj_key
		}
	})
}
</script>

<style lang="less" scoped>
:deep(.el-main) {
	padding: 0;
}
</style>
