// 引入 eplis-core
const ElpisCore = require('./elpis-core');
// 引入 前端工程化构建方法
const FEBuildDev = require('./app/webpack/dev.js');
const FEBuildProd = require('./app/webpack/prod.js');

module.exports = {
	/**
	 * 服务端基础
	 */
	Controller: {
		Base: require('./app/controller/base.js')
	},
	Service: {
		Base: require('./app/service/base.js')
	},

	/**
	 * 编译构建前端工程
	 * @params env 环境变量 local/production
	 */
	frontendBuild(env) {
		if (env === 'local') {
			FEBuildDev();
		} else if (env === 'production') {
			FEBuildProd();
		}
	},

	/**
	 * 启动 elpis 
	 * @params options 项目配置，透传到 elpis-core
	 */
	serverStart(options = {}) {
		const app = ElpisCore.start(options);
		return app;
	}
}
