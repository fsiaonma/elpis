const path = require('path');

module.exports = {
	base: '/dist/prod/',
	build: {
		outDir: path.resolve(process.cwd(), 'app/public/dist/prod'),
		rollupOptions: {
			output: {
				entryFileNames: 'js/[name]-[hash].js',
				chunkFileNames: 'js/[name]-[hash].js',
				assetFileNames(assetInfo) {
					const name = assetInfo.names?.[0] || assetInfo.name || '';
					if (name.endsWith('.css')) {
						return 'css/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
				manualChunks(id) {
					if (/node_modules/.test(id)) {
						return 'vendor';
					}
					if (/common|widgets/.test(id)) {
						return 'common';
					}
				}
			}
		}
	},
	esbuild: {
		drop: ['console', 'debugger']
	}
};
