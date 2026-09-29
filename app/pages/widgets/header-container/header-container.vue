<template>
	<el-container class="header-container">
		<el-header class="header">
			<el-row type="flex" align="middle" class="header-row">
				<!-- 左上方 title -->
				<el-row type="flex" align="middle" class="title-panel">
					<img src="./asserts/logo.png" class="logo"/>
					<el-row class="text">{{title}}</el-row>
				</el-row>
				<!-- 插槽：菜单区域 -->
				<slot name="menu-content"></slot>
				<!-- 右上方区域 -->
				<el-row type="flex" align="middle" justify="end" class="setting-panel">
					<!-- 插槽：设置区域 -->
					<slot name="setting-content"></slot>
					<component
            v-if="BusinessHeaderConfig?.userPanel"
            :is="BusinessHeaderConfig?.userPanel.component"
          ></component>
				</el-row>
			</el-row>
		</el-header>
		<el-main class="main-container">
			<!-- 插槽：核心内容填充区域 -->
			<slot name="main-content"></slot>
		</el-main>
	</el-container>
</template>

<script setup>
import BusinessHeaderConfig from '$bussinessHeaderConfig';
defineProps({
	title: String
});
</script>

<style lang="less" scoped>
.header-container {
	height: 100%;
	min-width: 1000px;
	overflow: hidden;

	.header {
		max-height: 120px;
		border-bottom: 1px solid #E8E8E8;

		.header-row {
			height: 60px;
			padding: 0 20px;

			.title-panel {
				width: 180px;
				min-width: 180px;

				.logo {
					margin-right: 10px;
					width: 25px;
					height: 25px;
					border-radius: 50%;
				}

				.text {
					font-size: 15px;
					font-weight: 500;
				}
			}

			.setting-panel {
				margin-left: auto;
				min-width: 180px;
			}
		}
	}

	.main-container {}
}

:deep(.el-header) {
	padding: 0;
}
</style>