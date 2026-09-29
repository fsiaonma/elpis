const glob = require('glob');
const path = require('path');
const fs = require('fs');
const vuePlugin = require('@vitejs/plugin-vue');
const elpisTplPlugin = require('../plugins/elpis-tpl-plugin');

const vue = vuePlugin.default || vuePlugin;

function handleFile(file, entries = {}) {
	const entryName = path.basename(file, '.js');
	entries[entryName] = file;
}

function scanEntries() {
	const elpisPageEntries = {};
	const elpisEntryList = path.resolve(__dirname, '../../pages/**/entry.*.js');
	glob.sync(elpisEntryList).forEach(file => {
		handleFile(file, elpisPageEntries);
	});

	const businessPageEntries = {};
	const businessEntryList = path.resolve(process.cwd(), './app/pages/**/entry.*.js');
	glob.sync(businessEntryList).forEach(file => {
		handleFile(file, businessPageEntries);
	});

	return Object.assign({}, elpisPageEntries, businessPageEntries);
}

const allEntries = scanEntries();

const blankModulePath = path.resolve(__dirname, '../libs/blank.js');

const aliasMap = {};

const businessDashboardRouterConfig = path.resolve(process.cwd(), './app/pages/dashboard/router.js');
aliasMap['$businessDashboardRouterConfig'] = fs.existsSync(businessDashboardRouterConfig) ? businessDashboardRouterConfig : blankModulePath;

const businessComponentConfig = path.resolve(process.cwd(), './app/pages/dashboard/complex-view/schema-view/components/component-config.js');
aliasMap['$businessComponentConfig'] = fs.existsSync(businessComponentConfig) ? businessComponentConfig : blankModulePath;

const businessFormItemConfig = path.resolve(process.cwd(), './app/pages/widgets/schema-form/form-item-config.js');
aliasMap['$businessFormItemConfig'] = fs.existsSync(businessFormItemConfig) ? businessFormItemConfig : blankModulePath;

const businessSearchItemConfig = path.resolve(process.cwd(), './app/pages/widgets/schema-search-bar/search-item-config.js');
aliasMap['$businessSearchItemConfig'] = fs.existsSync(businessSearchItemConfig) ? businessSearchItemConfig : blankModulePath;

const bussinessHeaderConfig = path.resolve(process.cwd(), './app/pages/widgets/header-container/header-config.js');
aliasMap['$bussinessHeaderConfig'] = fs.existsSync(bussinessHeaderConfig) ? bussinessHeaderConfig : blankModulePath;

const baseConfig = {
	plugins: [vue(), elpisTplPlugin()],
	css: {
		preprocessorOptions: {
			less: {}
		}
	},
	build: {
		rollupOptions: {
			input: allEntries
		}
	},
	resolve: {
		extensions: ['.js', '.vue', '.less', '.css'],
		dedupe: ['vue', 'element-plus'],
		alias: {
			'vue': require.resolve('vue'),
			'@babel/runtime/helpers/toConsumableArray': require.resolve('@babel/runtime/helpers/toConsumableArray'),
			'@babel/runtime/helpers/defineProperty': require.resolve('@babel/runtime/helpers/defineProperty'),
			'@babel/runtime/helpers/asyncToGenerator': require.resolve('@babel/runtime/helpers/asyncToGenerator'),
			'@babel/runtime/regenerator': require.resolve('@babel/runtime/regenerator'),
			$elpisPages: path.resolve(__dirname, '../../pages'),
			$elpisCommon: path.resolve(__dirname, '../../pages/common'),
			$elpisCurl: path.resolve(__dirname, '../../pages/common/curl.js'),
			$elpisUtils: path.resolve(__dirname, '../../pages/common/utils.js'),
			$elpisWidgets: path.resolve(__dirname, '../../pages/widgets'),
			$elpisHeaderContainer: path.resolve(__dirname, '../../pages/widgets/header-container/header-container.vue'),
			$elpisSiderContainer: path.resolve(__dirname, '../../pages/widgets/sider-container/sider-container.vue'),
			$elpisSchemaTable: path.resolve(__dirname, '../../pages/widgets/schema-table/schema-table.vue'),
			$elpisSchemaForm: path.resolve(__dirname, '../../pages/widgets/schema-form/schema-form.vue'),
			$elpisSchemaSearchBar: path.resolve(__dirname, '../../pages/widgets/schema-search-bar/schema-search-bar.vue'),
			$elpisStore: path.resolve(__dirname, '../../pages/store'),
			$elpisBoot: path.resolve(__dirname, '../../pages/boot.js'),
			...aliasMap
		}
	}
};

module.exports = {
	allEntries,
	baseConfig
};
