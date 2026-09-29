<template>
	<header-container :title="projName">
		<template #menu-content>
			<!-- 根据 menuStore.menuList 渲染 -->
			<el-menu
				:default-active="activeKey"
				:ellipsis="false"
				mode="horizontal"
				@select="onMenuSelect"
			>
				<template v-for="item in menuStore.menuList">
					<sub-menu
						v-if="item.subMenu && item.subMenu.length > 0"
						:menu-item="item"
					></sub-menu>
					<el-menu-item v-else :index="item.key">
						{{ item.name }}
					</el-menu-item>
				</template>
			</el-menu>
		</template>
		<template #setting-content>
			<!-- 根据 projStore.projectList 渲染 -->
			<el-dropdown @command="handleProjectCommand">
				<span class="project-list">
					{{projName}}
					<el-icon v-if="projectStore.projectList.length > 1" class="el-icon--right">
						<ArrowDown />
					</el-icon>
				</span>
				<template v-if="projectStore.projectList.length > 1" #dropdown>
					<el-dropdown-menu>
						<el-dropdown-item
							v-for="item in projectStore.projectList"
							:key="item.key"
							:command="item.key"
							:disabled="item.name === projName"
						>
							{{item.name}}
						</el-dropdown-item>
					</el-dropdown-menu>
				</template>
			</el-dropdown>
		</template>
		<template #main-content>
			<slot name="main-content"></slot>
		</template>
	</header-container>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowDown } from '@element-plus/icons-vue';
import HeaderContainer from '$elpisWidgets/header-container/header-container.vue';
import SubMenu from './complex-view/sub-menu/sub-menu.vue';
import { useMenuStore } from '$elpisStore/menu.js';
import { useProjectStore } from '$elpisStore/project.js';

const route = useRoute();
const menuStore = useMenuStore();
const projectStore = useProjectStore();

defineProps({
	projName: String
});

const emit = defineEmits([ 'menu-select' ]);

const activeKey = ref('');
const setActiveKey = function() {
	const menuItem = menuStore.findMenuItem({
		key: 'key',
		value: route.query.key
	});
	activeKey.value = menuItem?.key;
}

watch(() => route.query.key, () => {
	setActiveKey();
});
watch(() => menuStore.menuList, () => {
	setActiveKey();
}, { deep: true });
onMounted(() => {
	setActiveKey();
});

const onMenuSelect = function(menuKey) {
	const menuItem = menuStore.findMenuItem({
		key: 'key',
		value: menuKey
	});
	emit('menu-select', menuItem);
}

const handleProjectCommand = function(event) {
	const projectItem = projectStore.projectList.find(item => item.key === event);
	if (!projectItem || !projectItem.homePage) { return; }
	const { host } = window.location;
	window.location.replace(`http://${host}/view/dashboard${projectItem.homePage}`);
}
</script>

<style lang="less" scoped>
.project-list {
	margin-right: 20px;
	cursor: pointer;
	color: var(--el-color-primary);
	display: flex;
	align-items: center;
	outline: none;
}

:deep(.el-menu--horizontal.el-menu) {
	border-bottom: 0
}
</style>
