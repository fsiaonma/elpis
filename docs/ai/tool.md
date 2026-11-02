# Tool

Tool 是运行时注册在 `ToolRegistryService` 中的能力，有三种来源：

| 来源 | source | 示例 |
| --- | --- | --- |
| 框架内置 | `builtin` | `retrieve`、`invoke_agent` |
| MCP 服务 | `mcp` | `list_directory`、`write_file` 等，见 [MCP](#ai/mcp.md) |
| 业务注册 | `builtin` | 在 Nest Service 中调用 `register()` |

Agent 在 `tools` 数组中按名字声明后才能使用。

## 内置工具

| 名称 | 作用 | 入参 |
| --- | --- | --- |
| `retrieve` | 从向量库检索知识片段，见 [RAG](#ai/rag.md) | `{ query: string }` |
| `invoke_agent` | 调用另一个 Agent，见 [多 Agent](#ai/multi-agent.md) | `{ agent: string, input: string }` |

`retrieve` 的名称和描述可以通过 `ai.rag.tool.name` / `ai.rag.tool.description` 修改。

## ToolDefinition

```ts
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  execute(input: unknown): Promise<unknown>;
  source?: 'builtin' | 'mcp';
}
```

## 业务注册工具

当工具需要访问数据库、调用其他 Service 时，在 Nest Provider 里注册。

**1. 取得 ToolRegistryService**

`ToolRegistryService` 未在公共入口导出，通过框架 dist 路径加载类，再从 `ModuleRef` 获取实例：

```ts
// app/modules/ai-tools/elpis-ai-bridge.ts
import { createRequire } from 'module';
import { dirname, join } from 'path';

const nestEntry = require.resolve('@fsiaonma/elpis/nest');
const elpisRoot = dirname(nestEntry);
const elpisRequire = createRequire(nestEntry);

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source?: 'builtin' | 'mcp';
  execute(input: unknown): Promise<unknown>;
};

export type ToolRegistryService = {
  get(name: string): ToolDefinition | undefined;
  register(tool: ToolDefinition): void;
};

export function resolveToolRegistryClass(): new (...args: unknown[]) => ToolRegistryService {
  return elpisRequire(join(elpisRoot, 'dist/ai/tool/tool-registry.service.js')).ToolRegistryService;
}
```

**2. 在启动钩子中注册**

```ts
// app/modules/ai-tools/order-tools.service.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DatabaseProvider } from '@fsiaonma/elpis/nest';
import { resolveToolRegistryClass, type ToolRegistryService } from './elpis-ai-bridge';

@Injectable()
export class OrderToolsService implements OnApplicationBootstrap {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly databaseProvider: DatabaseProvider,
  ) {}

  onApplicationBootstrap() {
    const registry = this.moduleRef.get(resolveToolRegistryClass(), {
      strict: false,
    }) as ToolRegistryService;

    registry.register({
      name: 'query_order',
      description: '按订单号查询订单状态与金额',
      source: 'builtin',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
      },
      execute: async (input) => {
        const { orderId } = input as { orderId: string };
        const row = await this.databaseProvider.db!('t_order').where({ order_id: orderId }).first();
        if (!row) throw new Error(`订单不存在: ${orderId}`);
        return { orderId, status: row.status, amount: row.amount };
      },
    });
  }
}
```

```ts
// app/modules/ai-tools/ai-tools.module.ts
import { Module } from '@nestjs/common';
import { ExtendModule } from '@fsiaonma/elpis/nest';
import { OrderToolsService } from './order-tools.service';

@Module({
  imports: [ExtendModule],
  providers: [OrderToolsService],
})
export class AiToolsModule {}
```

**3. 在 Agent 中声明**

```ts
const agent: AgentDefinition = {
  name: 'customer-service',
  skills: [],
  tools: ['query_order', 'retrieve'],
  prompt: '你是客服，用户询问订单时先调用 query_order。',
};
```

## 包装已有工具

`register()` 同名会覆盖，可用于给 MCP 工具加缓存、改写入参或结果：

```ts
onApplicationBootstrap() {
  const registry = this.moduleRef.get(resolveToolRegistryClass(), { strict: false }) as ToolRegistryService;

  const original = registry.get('parse_resume');
  if (!original) return;

  registry.register({
    ...original,
    execute: async (input) => {
      const result = await original.execute(input);
      saveToSession(input, result);   // 记录结果，供后续工具使用
      return result;
    },
  });
}
```

> MCP 工具在 MCP 模块初始化（`onModuleInit`）时注册，`onApplicationBootstrap` 晚于它执行，因此这里一定能取到。

## 查看工具

`GET /api/ai/tool/list` 返回 `[{ name, description, inputSchema, source }]`。
