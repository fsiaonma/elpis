# elpis

## 一个企业级全栈应用框架。

包名：`@fsiaonma/elpis`，入口为仓库根目录的 `index.js`。

---

## 安装与依赖

### 克隆后在本仓库安装

从 Git 拉取代码后，在 **elpis 仓库根目录** 安装依赖（`node_modules` 不会提交，需本地自行安装）：

```bash
git clone git@github.com:fsiaonma/elpis.git
cd elpis
npm install
```

### 在业务项目中安装

业务项目通过 npm 依赖本包时，在 **业务项目根目录** 执行：

```bash
npm install @fsiaonma/elpis
```

若尚未发布到 npm，可在业务项目的 `package.json` 里用 Git 地址等形式声明依赖，再执行 `npm install`。

### 本地联调（npm link）

改 elpis 源码时，希望业务项目立刻用到当前目录的版本，可以用 **npm link**：

**1. 在 elpis 仓库根目录**（需已 `npm install`）：

```bash
cd /path/to/elpis
npm install
npm link
```

会在全局注册包名 `@fsiaonma/elpis`，指向当前目录。

**2. 在业务项目根目录**：

```bash
cd /path/to/your-business-app
npm link @fsiaonma/elpis
```

之后业务项目 `require('@fsiaonma/elpis')` 会解析到本地 elpis 目录；修改 elpis 后重启业务进程即可验证（前端构建若带缓存，必要时清缓存或重新构建）。

**取消 link，恢复 registry / lockfile 里的正式依赖：**

```bash
# 业务项目
cd /path/to/your-business-app
npm unlink @fsiaonma/elpis
npm install

# elpis 仓库（可选，取消全局 link）
cd /path/to/elpis
npm unlink
```

> 注意：link 期间业务项目的 `node_modules/@fsiaonma/elpis` 是指向本地的符号链接；提交代码时不要误把 link 状态当成已发布版本。

---

## 常用命令

在 elpis 仓库根目录：

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm link` | 将 `@fsiaonma/elpis` 注册到全局，供其他项目 `npm link @fsiaonma/elpis` |
| `npm run lint` | ESLint 检查（提交前 ghooks 也会跑） |
| `npm test` | 运行 Mocha 测试（`_ENV=local`） |

---

## 本地配置与忽略项

`.gitignore` 中常见忽略：

- `node_modules` — 依赖目录，用 `npm install` 生成
- `config.local.js` — 本地私有配置，可复制 `config/config.default.js` 思路自行添加
- `app/public/dist` — 前端构建产物

---

### model配置 
```javascript
{
  mode: 'dashboard', // 模版类型，不同模版类型对应不一样的模版数据结构
  name: '', // 名称
  desc: '', // 描述
  icon: '', // icon
  homePage: ‘’, // 首页(项目配置)
  // 头部菜单
  menu: [{
    key: '', // 菜单唯一描述，
    name: '', // 菜单名称
    menuType: '', // 枚举值：group / module

    // 当 menuType == group 时，可填
    subMenu: [{
      // 可递归 menuItem
    }, ...],

    // 当 menuType == module 时，可填
    moduleType: '', // 枚举值：sider/iframe/custom/schema

    // 当 moduleType == sider 时
    siderConfig: {
      menu: [{
        // 可递归 menuItem(除 moduleType === sider)
      }, ...]
    },

    // 当 moduleType == iframe 时
    iframeConfig: {
      path: '', // iframe 路径
    },

    // 当 moduleType == custom 时
    customConfig: {
      path: '', // 自定义路由路径
    },

    // 当 moduleType == schema 时
    schemaConfig: {
      api: '', // 数据源API（遵循 RESTFUL 规范）
      schema: { // 板块数据结构
        type: 'object',
        properties: {
          key: {
            ...schema, // 标准 schema 配置
            type: '', // 字段类型
            label: '', // 字段的中文名
            // 字段在 table 中的相关配置
            tableOption: {
              ...elTableColumnConfig, // 标准 el-table-column 配置
              toFixed: 0, // 保留小数点后几位
              visible: true, // 默认为 true（false 时，表示不在表单中显示）
            },
            // 字段在 search-bar 中的相关配置
            searchOption: {
              ...eleComponentConfig, // 标准 el-component-column 配置
              comType: '', // 配置组件类型 input/select/.....
              default: '', // 默认值

              // comType === 'select'
              enumList: [], // 下拉框可选项

              // comType === 'dynamicSelect'
              api: ''
            },
            // 字段在不同动态 component 中的相关配置，前缀对应 componentComfig 中的键值
            // 如：componentConfig.createForm，这里对应 createFormOption
            // 字段在 createForm 中相关配置
            createFormOption: {
              ...eleComponentConfig, // 标准 el-component 配置
              comType: '', // 控件类型 input/selct/input-number
              visible: true, // 是否展示 (true/false)，默认为 true
              disabled: false, // 是否禁用 (true/false)，默认为 false
              default: '', // 默认值

              // comType === 'select' 时生效
              enumList: [] // 枚举列表
            },
            // 字段在 editForm 表单中的相关配置
            editFormOption: {
              ...eleComponentConfig, // 标准 el-component 配置
              comType: '', // 控件类型 input/selct/input-number
              visible: true, // 是否展示 (true/false)，默认为 true
              disabled: false, // 是否禁用 (true/false)，默认为 false
              default: '', // 默认值

              // comType === 'select' 时生效
              enumList: [] // 枚举列表
            },
            detailPanelOption: {
              ...eleComponentConfig // 标准 el-component 配置
            }
          },
          ...
        },
        required: [], // 标记哪些字段是必填项
      },
      // table 相关配置
      tableConfig: {
        headerButtons: [{
          label: '', // 按钮中文名
          eventKey: '', // 按钮事件名
          // 按钮事件具体配置
          eventOption: {
            // 当 eventKey === 'showComponent'
            comName: '' // 组件名称
          }, 
          ...elButtonConfig // 标准 el-button 配置
        }, ...],
        rowButtons: [{
          label: '', // 按钮中文名
          eventKey: '', // 按钮事件名
          eventOption: {
            // 当 eventKey === 'showComponent'
            comName: '' // 组件名称

            // 当 eventKey === 'remove'
            params: {
              // paramKey = 参数的键值
              // rowValueKey = 参数值, 格式为 schema::tableKey，到 table 中找相应的字段
              paramKey: rowValueKey
            }
          }, // 按钮事件具体配置
          ...elButtonConfig // 标准 el-button 配置
        }, ...]
      }, 
      // search-bar 相关配置
      searchConfig: {},
      // 动态组件 相关配置
      componentConfig: {
        // create-form 表单相关配置
        createForm: {
          title: '', // 表单标题
          saveBtnText: '', // 保存按钮文案
        },
        // edit-form 表单相关配置
        editForm: {
          mainKey: '', // 表单主键，用于唯一标识要修改的数据对象
          title: '', // 表单标题
          saveBtnText: '', // 保存按钮文案
        },
        // detail-panel 相关配置
        detailPanel: {
          mainKey: '', // 表单主键，用于唯一标识要修改的数据对象
          title: '', // 表单标题
        }
        // ...支持用户动态扩展
      }
    }
  }, ...]
}
```


### 服务端启动
``` javascript
const {
  serverStart
} = require('@fsiaonma/elpis');  

// 启动 elpis 服务
const app = serverStart({});
```


### 自定义服务端
- router-schema
- router
- controller
- service
- extend
- config


### 前端构建
```javascript
const { frontendBuild } = require('@fsiaonma/elpis');

// 编译构建前端工程
frontendBuild(process.env._ENV);
```


### 自定义页面扩展
* 在 `app/pages/` 目录下写入口 entry.xxx.js

### dashboard / custom-view 自定义页面扩展
* 在 `app/pages/dashboard/xxxx` 下写页面

### dashboard / shcema-view / components 动态组件扩展
1. 在 `app/pages/dashboard/complex-view/schema-view/components` 下写组件
2. 配置到 `app/pages/dashboard/complex-view/schema-view/components/component-config.js`

### schema-form 控件扩展
1. 在 `app/widgets/schema-form/complex-view` 下写控件
2. 配置到 `app/widgets/schema-form/form-item-config.js`

### schema-search-bar 控件扩展
1. 在 `app/widgets/schema-search-bar/complex-view` 下写控件
2. 配置到 `app/widgets/schema-search-bar/search-item-config.js`
