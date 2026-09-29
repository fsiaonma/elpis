module.exports = (app) => {
	const BaseService = require('./base')(app);
	const modelList = require('../../model/index.js')(app);
	return class ProjectService extends BaseService {
		/**
		 * 根据 projKey 获取项目配置
		 */
		get(projKey) {
			let projConfig;
	
			modelList.forEach(modelItem => {
				if (modelItem.project[projKey]) {
					projConfig = modelItem.project[projKey];
				}
			});

			return projConfig;
		}

		/**
		 * 获取统一模型下的项目列表（如果无 projKey，取全量）
		 */
		getList({ projKey }) {
			return modelList.reduce((preList, modelItem) => {
				const { project } = modelItem;

				// 如果有传 projKey 则只去当前同模型下的项目，不传的情况下则取全量。
				if (projKey && !project[projKey]) {
					return preList;
				}

				for (const pKey in project) {
					preList.push(project[pKey]);
				}

				return preList;
			}, []);
		}

		/** 
		 * 获取所有模型与项目的结构化数据
		 */ 
		async getModelList() {
			return modelList;
		}
	}
}