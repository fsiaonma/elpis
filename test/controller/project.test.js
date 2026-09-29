const assert = require('assert');
const supertest = require('supertest');
const md5 = require('md5');
const eplisCore = require('../../elpis-core');

const signKey = 'klx05hb3n1c9ujp8uhxbs2ikkiowp212';
const st = Date.now();

describe('测试 project 相关接口', function() {
	this.timeout(60000);

	let modelList;
	const projectList = [];
	let request;

	it('启动服务', async () => {
		const app = await eplisCore.start();
		modelList = require('../../model/index.js')(app);
		modelList.forEach(modelItem => {
			const { project } = modelItem;
			for (const pKey in project) {
				projectList.push(project[pKey]);
			}
		});
		request = supertest(app.listen());
	});

	it ('GET /api/project without proj_key', async () => {
		let tmpRequest = request.get('/api/project');
		tmpRequest = tmpRequest.set('s_t', st);
		tmpRequest = tmpRequest.set('s_sign', md5(`${signKey}_${st}`));
		const res = await tmpRequest;
		assert(res.body.success === false);

		const resBody = res.body;
		assert(resBody.code === 442);
		assert(resBody.message.indexOf(`request validate fail: data should have required property 'proj_key'`) > -1);
	});

	it ('GET /api/project fail', async () => {
		let tmpRequest = request.get('/api/project');
		tmpRequest = tmpRequest.set('s_t', st);
		tmpRequest = tmpRequest.set('s_sign', md5(`${signKey}_${st}`));
		temRequest = tmpRequest.query({
			proj_key: 'xxxxxxxxxx'
		});
		const res = await tmpRequest;
		assert(res.body.success === false);

		const resBody = res.body;
		assert(resBody.code === 50000);
		assert(resBody.message === '获取项目异常');
	});

	it ('GET /api/project with proj_key', async () => {
		for (let i = 0; i < projectList.length; ++i) {
			const projItem = projectList[i];
			const { key: projKey } = projItem;

			console.log(`---------- GET /api/project with proj_key: ${projKey}`);

			let tmpRequest = request.get('/api/project');
			tmpRequest = tmpRequest.set('s_t', st);
			tmpRequest = tmpRequest.set('s_sign', md5(`${signKey}_${st}`));
			temRequest = tmpRequest.query({
				proj_key: projKey
			});
			const res = await tmpRequest;
			assert(res.body.success === true);

			const resData = res.body.data;
			assert(resData.key === projKey);
			assert(resData.modelKey);
			assert(resData.name);
			assert(resData.desc !== undefined);
			assert(resData.homePage !== undefined);

			const { menu } = resData;
			menu.forEach(menuItem => {
				checkMenuItem(menuItem);
			});
		}

		// 校验 menu 菜单
		function checkMenuItem(menuItem) {
			console.log('---------- GET /api/project with proj_key - menuKey:', menuItem.key);
			assert(menuItem.key);
			assert(menuItem.name);
			assert(menuItem.menuType);

			if (menuItem.menuType === 'group') {
				assert(menuItem.subMenu !== undefined);
				menuItem.subMenu.forEach(subMenuItem => {
					checkMenuItem(subMenuItem);
				})
			}

			if (menuItem.menuType === 'module') {
				checkModule(menuItem);
			}
		}

		// 检查 module 菜单配置
		function checkModule(menuItem) {
			const { moduleType } = menuItem;
			assert(moduleType);

			if (moduleType === 'sider') {
				const { siderConfig } = menuItem;
				assert(siderConfig);
				assert(siderConfig.menu);
				siderConfig.menu.forEach(siderMenuItem => {
					checkMenuItem(siderMenuItem);
				});
			}

			if (moduleType === 'iframe') {
				const { iframeConfig } = menuItem;
				assert(iframeConfig);
				assert(iframeConfig.path !== undefined);
			}

			if (moduleType === 'custom') {
				const { customConfig } = menuItem;
				assert(customConfig);
				assert(customConfig.path !== undefined);
			}

			if (moduleType === 'schema') {
				const { schemaConfig } = menuItem;
				assert(schemaConfig);
				assert(schemaConfig.api !== undefined);
				assert(schemaConfig.schema);
			}
		}
	});

	it('GET /api/project/list without proj_key', async () => {
		let tmpRequest = request.get('/api/project/list');
		tmpRequest = tmpRequest.set('s_t', st);
		tmpRequest = tmpRequest.set('s_sign', md5(`${signKey}_${st}`));
		const res = await tmpRequest;
		assert(res.body.success === true);

		const resData = res.body.data;
		assert(resData.length === projectList.length);
		for (let i = 0; i < resData.length; ++i) {
			const item = resData[i];
			assert(item.modelKey);
			assert(item.key);
			assert(item.name);
			assert(item.desc !== undefined);
			assert(item.homePage !== undefined);
		}
	});

	it('GET /api/project/list with proj_key', async () => {
		const { key: projKey } = projectList[Math.floor(Math.random() * projectList.length)];
		console.log(`---------- GET /api/project/list with proj_key: ${projKey}`);
		const { modelKey } = projectList.find(item => item.key === projKey);

		let tmpRequest = request.get('/api/project/list');
		tmpRequest = tmpRequest.set('s_t', st);
		tmpRequest = tmpRequest.set('s_sign', md5(`${signKey}_${st}`));
		temRequest = tmpRequest.query({
			proj_key: projKey
		});
		const res = await tmpRequest;
		assert(res.body.success === true);

		const resData = res.body.data;
		assert(projectList.filter(item => item.modelKey === modelKey).length === resData.length);
		for (let i = 0; i < resData.length; ++i) {
			const item = resData[i];
			assert(item.modelKey);
			assert(item.key);
			assert(item.name);
			assert(item.desc !== undefined);
			assert(item.homePage !== undefined);
		}
	});

	it('GET /api/project/model_list', async () => {
		let tmpRequest = request.get('/api/project/model_list');
		tmpRequest = tmpRequest.set('s_t', st);
		tmpRequest = tmpRequest.set('s_sign', md5(`${signKey}_${st}`));
		const res = await tmpRequest;
		assert(res.body.success === true);

		const resData = res.body.data;
		assert(resData.length > 0);

		for (let i = 0; i < resData.length; ++i) {
			const item = resData[i];
			assert(item.model);
			assert(item.model.key);
			assert(item.model.name);
			assert(item.project);
			for (const projKey in item.project) {
				assert(item.project[projKey].key);
				assert(item.project[projKey].name);
			}
		}
	});
});