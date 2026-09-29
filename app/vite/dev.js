const { createServer, mergeConfig } = require('vite');
const { baseConfig } = require('./config/vite.base.js');
const devConfig = require('./config/vite.dev.js');

module.exports = () => {
	(async () => {
		const config = mergeConfig(baseConfig, devConfig);
		const server = await createServer(config);
		await server.listen();
		console.log('http://127.0.0.1:9002');
	})();
};
