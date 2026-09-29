const { build, mergeConfig } = require('vite');
const { baseConfig } = require('./config/vite.base.js');
const prodConfig = require('./config/vite.prod.js');

module.exports = () => {
	console.log('\nbuilding... \n');

	(async () => {
		try {
			const config = mergeConfig(baseConfig, prodConfig);
			const result = await build(config);
			console.log(result);
		} catch (err) {
			console.log(err);
		}
	})();
};
