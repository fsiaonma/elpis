const path = require('path');
const { sep } = path;

/**
 *  config loader
 *  @param {object} app koa 实例  
 *
 *  配置区分 本地/测试/生产，通过 env 环境读取不同文件配置 evn.config
 *  通过 env.config 覆盖 default.config 加载到 app.config 中
 *
 *  目录下对应的 config 配置
 *  默认配置 config/config.default.js
 *  本地配置 config/config.local.js
 *  测试配置 config/config.beta.js
 *  生产配置 config/config.prod.js
 *
 */
module.exports = (app) => {
	// elpis config 目录及相关文件
	const elpisConfigPath = path.resolve(__dirname, `..${sep}..${sep}config`);
	let defaultConfig = require(path.resolve(elpisConfigPath, `.${sep}config.default.js`));
  
 	// 业务 config 目录及相关文件
 	const businessConfigPath = path.resolve(process.cwd(), `.${sep}config`);
 	try {
 		defaultConfig = {
 			...defaultConfig,
 			...require(path.resolve(businessConfigPath, `.${sep}config.default.js`))
 		}
 	} catch(e) {
 		console.log('[exception] default.config file exception');
 	}

 	// 获取 env.config
 	let envConfig = {};
 	try {
 		if (app.env.isLocal()) { // 本地环境
 			envConfig = require(path.resolve(businessConfigPath, `.${sep}config.local.js`));
 		} else if (app.env.isBeta()) { // 测试环境
 			envConfig = require(path.resolve(businessConfigPath, `.${sep}config.beta.js`));
 		} else if (app.env.isProduction()) { // 生产环境
 			envConfig = require(path.resolve(businessConfigPath, `.${sep}config.prod.js`));
 		}
 	} catch(e) {
 		console.log('[exception] env.config file exception');
 	}

 	// 覆盖并加载 config 配置
 	app.config = Object.assign({}, defaultConfig, envConfig);
}
