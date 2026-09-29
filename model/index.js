const _ = require('lodash');
const glob = require('glob');
const path = require('path');
const { sep } = path;

// project 继承 model 方法
const projectExtendModel = (model, project) => {
	return _.mergeWith({}, model, project, (modelValue, projValue) => {
		// 处理数组合并的特殊情况
		if (Array.isArray(modelValue) && Array.isArray(projValue)) {
			let result = [];

			// 因为 project 继承 model，所以需要处理修改和新增内容的情况
			// project有的键值，model也有 => 修改（重载）
			// project有的键值，model没有 => 新增
			// model有的键值，project没有 => 保留（继承）

			// 处理修改和保留
			for (let i = 0; i < modelValue.length; ++i) {
				let modelItem = modelValue[i];
				const projItem = projValue.find(projItem => projItem.key === modelItem.key);
				// project有的键值，model也有，则递归调用 projectExtendModel 方法覆盖修改
				result.push(projItem ? projectExtendModel(modelItem, projItem) : modelItem);
			}

			// 处理新增
			for (let i = 0; i < projValue.length; ++i) {
				const projItem = projValue[i];
				const modelItem = modelValue.find(modelItem => modelItem.key === projItem.key);
				if (!modelItem) {
					result.push(projItem);
				}
			}

			return result;
		}
	})
}

/**
 * 解析 model 配置，并返回组织且继承后的数据结构
   [{
	   model: ${model}
	   project: {
			 proj1Key: ${proj1},
			 proj2Key: ${proj2}
	   }
   }, ...]
 */
module.exports = (app) => {
	const modelList = [];

	// 遍历当前文件夹，构造模型数据结构，挂载到 modelList 上
	const modelPath = path.resolve(process.cwd(), `.${sep}model`);
	const fileList = glob.sync(path.resolve(modelPath, `.${sep}**${sep}**.js`));
	fileList.forEach(file => {
		if (file.indexOf('index.js') > -1) { return; }

		// 区分配置类型 (model / project)
		const type = file.indexOf(`${sep}project${sep}`) > -1 ? 'project' : 'model';

		if (type === 'project') {
			const modelKey = file.match(/\/model\/(.*?)\/project/)?.[1];
			const projKey = file.match(/\/project\/(.*?)\.js/)?.[1];
			let modelItem = modelList.find(item => item.model?.key === modelKey);
			if (!modelItem) { // 初始化 model 数据结构
				modelItem = {};
				modelList.push(modelItem);
			}
			if (!modelItem.project) { // 初始化 project 数据结构
				modelItem.project = {};
			}
			modelItem.project[projKey] = require(path.resolve(file));
			modelItem.project[projKey].key = projKey; // 注入 projectKey
			modelItem.project[projKey].modelKey = modelKey; // 注入 modelKey
		}

		if (type === 'model') {
			const modelKey = file.match(/\/model\/(.*?)\/model\.js/)?.[1];
			let modelItem = modelList.find(item => item.model?.key === modelKey);
			if (!modelItem) {  // 初始化 model 数据结构
				modelItem = {};
				modelList.push(modelItem);
			}
			modelItem.model = require(path.resolve(file));
			modelItem.model.key = modelKey; // 注入 modelKey
		}
	});

	// 数据进一步整理： project => 继承 model
	modelList.forEach(item => {
		const { model, project } = item;
		for (const key in project) {
			project[key] = projectExtendModel(model, project[key]);
		}
	});

	return modelList;
}