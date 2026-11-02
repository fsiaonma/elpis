# MCP 接入

Elpis 内置 [Model Context Protocol](https://modelcontextprotocol.io/) 客户端。启动时连接配置的 MCP Server，拉取工具列表并注册为 `source: 'mcp'` 的 Tool，Agent 在 `tools` 中按**工具名**声明即可使用。

## 配置

```js
module.exports = {
  ai: {
    mcp: {
      enabled: true,
      servers: [
        // 1. stdio：由框架拉起子进程
        {
          name: 'filesystem',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
        },
        // 2. stdio：本地 Python 服务
        {
          name: 'resume-parser',
          command: 'uv',
          args: ['run', 'python', '-u', 'server.py'],
          cwd: 'mcp-servers/resume-parser-py',
          env: { PYTHONUNBUFFERED: '1' },
        },
        // 3. stdio：Java
        {
          name: 'jd-store',
          command: 'java',
          args: ['-jar', 'target/jd-store.jar'],
          cwd: 'mcp-servers/jd-store-java',
          env: { MYSQL_URL: 'jdbc:mysql://127.0.0.1:3306/my_db', MYSQL_USER: 'root', MYSQL_PASSWORD: 'your-password' },
        },
        // 4. stdio：Go 二进制
        {
          name: 'recall',
          command: './recall-go',
          cwd: 'mcp-servers/recall-go',
        },
        // 5. 远程 HTTP 服务
        {
          name: 'search',
          url: 'https://mcp.example.com/mcp',
          headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` },
          timeoutMs: 60000,
        },
      ],
    },
  },
};
```

| 字段 | 说明 |
| --- | --- |
| `enabled` | 总开关 |
| `servers[].name` | 服务名，用于日志 |
| `command` / `args` / `env` / `cwd` | stdio 模式，`cwd` 相对项目根目录 |
| `url` / `headers` | 远程模式 |
| `timeoutMs` | 单次请求超时，默认 30000 |

> `command` 与 `url` **二选一**，同时配置会报错。

## 在 Agent 中使用

启动日志会打印每个服务注册的工具名：

```text
[McpRegistry] server "filesystem" registered tools: [ 'read_file', 'write_file', 'list_directory', ... ]
```

把需要的工具名写进 Agent：

```ts
const agent: AgentDefinition = {
  name: 'project-assistant',
  skills: ['project-query'],
  tools: ['list_directory', 'write_file', 'retrieve'],
  prompt: `你是项目助手。filesystem 工具的 path 相对项目根目录（.），
用户说「data 目录」时 path 传 data。`,
};
```

也可以随时调用 `GET /api/ai/tool/list` 查看，`source` 为 `mcp` 的就是 MCP 工具。

## 自己写一个 MCP Server

任何语言实现 MCP 协议都可以接入。Node.js 示例（`@modelcontextprotocol/sdk`）：

```js
// mcp-servers/hello/server.mjs
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'hello', version: '1.0.0' });

server.tool(
  'greet',
  '向某人打招呼',
  { name: z.string().describe('名字') },
  async ({ name }) => ({ content: [{ type: 'text', text: `你好，${name}` }] }),
);

await server.connect(new StdioServerTransport());
```

```js
servers: [
  { name: 'hello', command: 'node', args: ['mcp-servers/hello/server.mjs'] },
]
```

Python 示例（`mcp` 官方 SDK）：

```python
# mcp-servers/resume-parser-py/server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("resume-parser")

@mcp.tool()
def parse_resume(file_path: str) -> dict:
    """解析简历文件，返回结构化 JSON"""
    return {"basic": {"name": "张三"}, "skills": ["Vue", "Node.js"]}

if __name__ == "__main__":
    mcp.run()
```

## 工具结果

MCP 工具返回 `{ content: [{ type: 'text', text }] }`，会原样回填给模型。需要结构化数据时，可在服务端返回 JSON 文本，或参考 [Tool · 包装已有工具](#ai/tool.md) 在 Elpis 侧解析。

## 排查

- 启动时报错：检查 `command` 是否在 PATH 中、`cwd` 是否存在
- stdio 服务**不能往 stdout 打印日志**（会破坏协议），日志请写 stderr
- Python 建议 `-u` 或 `PYTHONUNBUFFERED=1`，避免输出缓冲导致超时
