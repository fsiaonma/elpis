const webpack = require('webpack');
const webpackProdConfig = require('./config/webpack.prod.js');

module.exports = () => {
	console.log('\nbuilding... \n');

	webpack(webpackProdConfig, (err, stats) => {
		if (err) {
			console.log(err);
			return;
		}
		
		process.stdout.write(`${stats.toString({
			colors: true, // 在控制台输出色彩信息
			modules: false, // 不显示每个模块的打包信息
			children: false, // 不显示子编译任务的信息
			chunks: false, // 不显示每个代码块的信息
			chunkModules: true // 显示代码块中模块的信息
		})}\n`)
	});
}
