# Skill

Skill 是**写在业务仓库里、给 Agent 调用的函数**。框架把它转换为模型的 function tool：`name` 是函数名，`description` 告诉模型何时用，`inputSchema` 描述参数。

## 定义

```ts
// app/skills/project-query.skill.ts
import type { SkillContext, SkillDefinition } from '@fsiaonma/elpis';

const projectQuery: SkillDefinition = {
  name: 'project-query',
  description: '按 projKey 查询项目配置，返回项目名称、描述与首页',
  inputSchema: {
    type: 'object',
    properties: {
      projKey: { type: 'string', description: '项目标识，例如 jd、taobao' },
    },
    required: ['projKey'],
  },
  async execute(input: unknown, _ctx: SkillContext) {
    const { projKey } = input as { projKey: string };
    if (!projKey) throw new Error('projKey 不能为空');

    const project = await findProject(projKey);
    if (!project) throw new Error(`项目不存在: ${projKey}`);

    // 返回给模型的内容尽量精简
    const { key, name, desc, homePage } = project;
    return { key, name, desc, homePage };
  },
};

export default projectQuery;
```

| 字段 | 说明 |
| --- | --- |
| `name` | 唯一名称，Agent 的 `skills` 中引用 |
| `description` | 给模型看的用途说明，直接影响调用准确率 |
| `inputSchema` | JSON Schema，模型据此生成参数 |
| `execute(input, ctx)` | 执行函数，返回值会序列化后回填给模型 |

## 注册规则

- `app/skills/**/*.skill.ts` → `dist/skills/**/*.skill.js`
- `export default` 定义对象
- 在 Agent 的 `skills` 数组中声明后才会对该 Agent 可见

## 错误处理

`execute` 抛出的错误不会中断运行，而是作为失败结果回填给模型，模型可以据此重试或向用户说明。因此**用清晰的错误信息 throw** 是推荐做法。

## 在 Skill 中访问业务能力

Skill 是普通模块，可以 `import` 任何业务代码。当前 `ctx` 为空对象，Skill 不在 Nest 依赖注入容器中。常见做法：

**直接调用纯函数 / 外部接口**

```ts
import axios from 'axios';

async execute(input) {
  const { orderId } = input as { orderId: string };
  const { data } = await axios.get(`http://order-service/api/order/${orderId}`);
  return data;
}
```

**复用框架内部服务**

```ts
import { createRequire } from 'module';
import * as path from 'path';

const runtimeRequire = createRequire(__filename);
const elpisDist = path.resolve(process.cwd(), 'node_modules/@fsiaonma/elpis/dist');
const { ProjectService } = runtimeRequire(`${elpisDist}/modules/project/project.service`);
const { ModelService } = runtimeRequire(`${elpisDist}/modules/project/model.service`);

const projectService = new ProjectService(new ModelService());
```

**需要 Nest 注入的服务（数据库、配置等）**：改用 [Tool 注册](#ai/tool.md)，在 Nest Service 里注册工具，就能使用依赖注入。

## Skill 还是 Tool？

| | Skill | Tool（自定义注册） |
| --- | --- | --- |
| 写在哪里 | `app/skills/*.skill.ts` | Nest Service 中 `register()` |
| 依赖注入 | 不支持 | 支持（DB、ConfigService、其他 Service） |
| 注册方式 | 自动扫描 | 启动钩子中手动注册 |
| Agent 声明 | `skills: []` | `tools: []` |
| 适合 | 无状态、独立的能力 | 依赖业务服务的能力、包装 MCP 工具 |

## 设计建议

- 一个 Skill 只做一件事，名字用动词短语：`project-query`、`match-rank`
- `description` 写清「什么时候用」和「返回什么」
- 参数尽量少且类型明确，必要字段放进 `required`
- 返回结构化 JSON，去掉模型用不上的字段，节省 token
