import input from './complex-view/input/input';
import select from './complex-view/select/select';
import dynamicSelect from './complex-view/dynamic-select/dynamic-select';
import dateRange from './complex-view/date-range/date-range';

// 业务扩展 search-item 配置
import BusinessSearchItemConfig from '$businessSearchItemConfig';

const SearchItemConfig = {
	input: {
		component: input
	},
	select: {
		component: select
	},
	dynamicSelect: {
		component: dynamicSelect
	},
	dateRange: {
		component: dateRange
	}
}

export default {
	...SearchItemConfig,
	...BusinessSearchItemConfig
}
