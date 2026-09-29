const path = require('path');

module.exports = {
	server: {
		host: '0.0.0.0',
		port: 9002,
		cors: true,
		hmr: true,
		origin: 'http://127.0.0.1:9002',
		fs: {
			allow: [
				process.cwd(),
				path.resolve(__dirname, '../../..')
			]
		}
	}
};
