const { bootstrap } = require('./dist/main');
// 引入 前端工程化构建方法
const FEBuildDev = require('./app/vite/dev.js');
const FEBuildProd = require('./app/vite/prod.js');

module.exports = {
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
	 * @params options 项目配置，透传到 Nest bootstrap
	 */
	serverStart(options = {}) {
		return bootstrap(options);
	}
}
