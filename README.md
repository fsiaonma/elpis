# elpis

一个企业级全栈应用框架。HTTP 内核已从 Koa 迁移为 NestJS；前端构建器使用 Vite。业务仓（如 elpis-demo）通过 Nest Module 扩展框架能力。

## Part2 成果

- Koa 内核与 loader 已删除，框架与 demo 统一 Nest Module 写法
- `serverStart()` / `frontendBuild()` 签名不变，8080 监听不变
- API 路径、返回格式（442 / 445 / 446）、cookie 行为与 1.0 一致
- 框架内核归位 `app/`（与 pages、vite、public、view 同级）
- 业务 Module 由 demo `dist/modules/**/*.module.js` 扫描注入，Fallback 最后

## 顶层目录

| 路径 | 说明 |
|------|------|
| `app/main.ts` | Nest bootstrap 入口，编译到 `dist/main.js` |
| `app/app.module.ts` | 根 Module：ConfigModule + ElpisModule.register() |
| `app/elpis.module.ts` | 框架 Module 聚合：Extend / Project / View / 扫描模块 / Fallback |
| `app/common/` | Guard / Pipe / Filter / Interceptor / 静态兜底 |
| `app/config/` | 配置 Module |
| `app/extend/` | Database / Logger Provider |
| `app/modules/` | 框架内置 Module（project、view） |
| `app/pages/` | 前端页面入口与组件 |
| `app/vite/` | Vite 构建器（dev / prod） |
| `app/public/` | 框架静态资源 |
| `app/view/` | `.tpl` 模板 |
| `app/types/` | 类型契约（express Request.projKey 增强） |
| `config/` | 框架默认配置 |
| `model/` | model 加载器（index.js） |
| `dist/` | Nest 编译产物 |
| `index.js` | 对外入口：serverStart / frontendBuild |
| `nest.js` | Nest 公共导出（BaseController、ConfigService 等） |
| `app/ai/` | Agent / MCP / RAG / Skill / Guardrail 等（Part3，见 `sdd/part3-agent/`） |
| `test/` | 框架回归测试 |
| `sdd/` | 设计与任务文档（part1–part3） |

## 安装与依赖

包名：`@fsiaonma/elpis`。对外入口为根目录 `index.js`（`serverStart` / `frontendBuild`）；Nest 侧见 `nest.js` 与 `package.json` 的 `exports`（含 `./types/express`）。

### 克隆并在框架仓安装

`node_modules`、`dist` 等不会提交，需在本地生成：

```bash
git clone git@github.com:fsiaonma/elpis.git
cd elpis
npm install
npm run build    # 编译 Nest → dist/；index.js 依赖 dist/main.js
```

开发改 TypeScript 时可开监听编译：

```bash
npm run build:watch
```

### 在业务项目中安装

在 **业务仓**（如 elpis-demo）根目录：

```bash
npm install @fsiaonma/elpis
```

未发布到 npm 时，可在业务仓 `package.json` 用 Git 等方式声明依赖后执行 `npm install`。

### 本地联调（npm link）

改框架源码时，让业务仓指向本机 elpis 目录：

```bash
# 1. 框架仓 elpis：安装依赖并编译，再注册全局 link
cd /path/to/elpis
npm install
npm run build          # 或另开终端 npm run build:watch
npm link

# 2. 业务仓 elpis-demo
cd /path/to/elpis-demo
npm link @fsiaonma/elpis
```

改完 `app/**/*.ts` 后需重新 `npm run build`（或保持 `build:watch`），业务仓重启 Nest 进程后生效。

**取消 link：**

```bash
cd /path/to/elpis-demo
npm unlink @fsiaonma/elpis
npm install

cd /path/to/elpis
npm unlink    # 可选
```

### 常用命令（框架仓）

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run build` | Nest 编译到 `dist/` |
| `npm run build:watch` | 监听 TypeScript 编译 |
| `npm link` | 全局注册 `@fsiaonma/elpis`，供业务仓 link |
| `npm run lint` | ESLint（pre-commit 会执行） |
| `npm test` | Mocha 回归（`_ENV=local`） |

### 本地忽略项（.gitignore）

- `node_modules` — 执行 `npm install` 生成  
- `dist`、`*.tsbuildinfo` — `npm run build` 生成  
- `config.local.js` — 本地私有配置  
- `app/public/dist`、`outputs` — 前端构建产物  

## 双终端启动（开发）

在业务仓（elpis-demo）开两个终端：

```bash
# 终端 A：Vite Dev Server，出脚本 / HMR
npm run build:dev
# → http://127.0.0.1:9002

# 终端 B：Nest 读页面、渲染 .tpl
npm run dev
# → http://127.0.0.1:8080
```

生产：

```bash
npm run build:prod   # 产物落 app/public/dist/prod，并写 entry.*.tpl
npm run prod         # Nest 8080 读 /dist/prod/
```

## 与 1.0 对照

| | Koa 1.0 | Nest（本版） |
|--|---------|--------------|
| HTTP 内核 | elpis-core + Koa loader | NestFactory + Module 扫描 |
| 业务扩展 | controller / router / service | demo `app/modules/` → `dist/modules/` |
| 多入口 | 扫两棵 `entry.*.js` 树 merge | 同样扫两棵树，进 `rollupOptions.input` |
| 页面模板 | HtmlWebpackPlugin 写 `.tpl` | `elpis-tpl-plugin` 写 `.tpl` |
| 开发进程 | Vite :9002 + Koa :8080 | Vite :9002 + Nest :8080（双终端不变） |
| 对外 API | `frontendBuild(env)` / `serverStart()` | 签名不变 |

### model配置 
```javascript
{
  mode: 'dashboard', // 模版类型，不同模版类型对应不一样的模版数据结构
  name: '', // 名称
  desc: '', // 描述
  icon: '', // icon
  homePage: '', // 首页(项目配置)
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


### 前端构建
```javascript
const { frontendBuild } = require('@fsiaonma/elpis');

// 编译构建前端工程（签名不变）
// local → Vite createServer :9002
// production → Vite build → app/public/dist/prod
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
