module.exports = (app) => {
	return {
		// 判断是否本地环境
		isLocal() {
			return process.env._ENV === 'local';
		},
		
		// 判断是否测试环境
		isBeta() {
			return process.env._ENV === 'beta';
		},

		// 判断是否生产环境
		isProduction() {
			return process.env._ENV === 'production';
		},

		// 获取当前环境
		get() {
			return process.env._ENV ?? 'local';
		}
	}
}