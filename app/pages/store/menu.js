import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMenuStore = defineStore('menu', () => {
	// 菜单列表
	const menuList = ref([]);

	// 设置菜单列表
	const setMenuList = function(list) {
		menuList.value = list;
	}

	/**
	 * 找出菜单目录
	 * @param key 搜索字段
	 * @param value 搜索值
	 * @param mList 要搜索的菜单列表
	 */
	const findMenuItem = function({ key, value }, mList = menuList.value) {
		for (let i = 0; i < mList.length; ++i) {
			const menuItem = mList[i];
			if (!menuItem) { continue; }

			const { menuType, moduleType } = menuItem;

			if (menuItem[key] === value) {
				return menuItem;
			}

			if (menuType === 'group' && menuItem.subMenu) {
				const mItem = findMenuItem({ key, value }, menuItem.subMenu);
				if (mItem) { return mItem; }
			}

			if (moduleType === 'sider' && menuItem.siderConfig && menuItem.siderConfig.menu) {
				const mItem = findMenuItem({ key, value }, menuItem.siderConfig.menu);
				if (mItem) { return mItem; }
			}
		}
	}

	/**
	 * 找出第一个菜单目录
	 * @param mList 菜单列表
	 */
	const findFirstMenuItem = function(mList = menuList.value) {
		if (!mList || !mList[0]) { return; }
		let firstMenuItem = mList[0];
		if (firstMenuItem.subMenu) {
			firstMenuItem = findMenuItem(firstMenuItem.subMenu);
		}
		return firstMenuItem;
	}

	return {
		menuList,
		setMenuList,
		findMenuItem,
		findFirstMenuItem
	}
});
