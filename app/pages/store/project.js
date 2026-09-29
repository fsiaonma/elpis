import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useProjectStore = defineStore('project', () => {
	// 项目列表
	const projectList = ref([]);

	// 设置项目列表
	const setProjectList = function(list) {
		projectList.value = list;
	}

	return {
		projectList,
		setProjectList
	}
});
