# HTTP 与流式接口

所有接口前缀 `/api/ai`，需要签名（浏览器中用 `$curl` 或自行带签名头）。

## 接口列表

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/agent/run` | 同步运行 |
| `POST` | `/agent/run/stream` | SSE 流式运行 |
| `GET` | `/agent/list` | Agent 列表 |
| `GET` | `/agent/graph` | 运行图结构 |
| `GET` | `/agent/config` | `{ threadEnabled }` |
| `GET` | `/tool/list` | Tool 列表 |
| `GET` | `/trace/:runId` | 运行记录 |

## 同步运行

```http
POST /api/ai/agent/run
Content-Type: application/json

{ "agent": "project-assistant", "input": "查询 jd 项目配置", "threadId": "可选" }
```

```json
{
  "success": true,
  "data": {
    "runId": "6f1c…",
    "output": "jd 项目是京东电商系统……",
    "steps": [ { "type": "plan", "iteration": 1 }, … ],
    "threadId": "a2b3…"
  },
  "metadata": {}
}
```

| 错误 | code |
| --- | --- |
| 未传 `agent` | `442` |
| Agent 不存在 | `40401` |
| 运行异常（模型报错等） | `50000`，`message` 为错误原因 |

## 流式运行（SSE）

请求体与同步接口一致，响应为 `text/event-stream`：

```text
event: step
data: {"type":"plan","iteration":1}

event: step
data: {"type":"skill","iteration":1,"name":"project-query"}

event: delta
data: {"content":"jd 项目是京东电商系统……"}

event: done
data: {"success":true,"data":{"runId":"…","output":"…","steps":[…],"threadId":"…"}}
```

| event | data |
| --- | --- |
| `step` | 一个 Step，可用于实时展示「正在调用 xxx 工具」 |
| `delta` | `{ content }` 回答内容 |
| `done` | `{ success, data: RunResult }`；出错时为 `{ success: false, message, code }` |

### 前端消费

浏览器 `EventSource` 不支持 POST，使用 `fetch` + `ReadableStream`：

```js
import md5 from 'md5';

function signedHeaders() {
  const st = Date.now();
  return {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    s_t: String(st),
    s_sign: md5(`${SIGN_KEY}_${st}`),   // 与 $curl 相同的签名 key
  };
}

export async function runAgentStream({ agent, input, threadId, onStep, onDelta, onDone, signal }) {
  const resp = await fetch('/api/ai/agent/run/stream', {
    method: 'POST',
    headers: signedHeaders(),
    credentials: 'include',
    body: JSON.stringify({ agent, input, threadId }),
    signal,
  });

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const event = /^event: (.*)$/m.exec(block)?.[1];
      const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? 'null');

      if (event === 'step') onStep?.(data);
      if (event === 'delta') onDelta?.(data.content);
      if (event === 'done') onDone?.(data);
    }
  }
}
```

```vue
<script setup>
import { ref } from 'vue';
import { runAgentStream } from './sse-client';

const steps = ref([]);
const answer = ref('');
const threadId = ref();

const send = (text) => {
  steps.value = [];
  answer.value = '';
  runAgentStream({
    agent: 'project-assistant',
    input: text,
    threadId: threadId.value,
    onStep: (s) => steps.value.push(s),
    onDelta: (c) => (answer.value = c),
    onDone: (res) => { if (res.success) threadId.value = res.data.threadId; },
  });
};
</script>
```

## 服务端调用

在 Nest Service 中直接调用编排器，不经过 HTTP：

```ts
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import type { RunResult, AgentStreamEvent } from '@fsiaonma/elpis/nest';

type Orchestrator = {
  run(agent: string, input: unknown, threadId?: string): Promise<RunResult>;
  streamRun(agent: string, input: unknown, threadId?: string): AsyncGenerator<AgentStreamEvent>;
};

const nestEntry = require.resolve('@fsiaonma/elpis/nest');
const { LangGraphOrchestratorService } = createRequire(nestEntry)(
  join(dirname(nestEntry), 'dist/ai/runtime/langgraph/langgraph-orchestrator.service.js'),
);

@Injectable()
export class ResumeService {
  constructor(private readonly moduleRef: ModuleRef) {}

  private get orchestrator(): Orchestrator {
    return this.moduleRef.get(LangGraphOrchestratorService, { strict: false });
  }

  async analyze(resumeId: string) {
    const result = await this.orchestrator.run('studio-supervisor', { resumeId });
    return { output: result.output, runId: result.runId };
  }
}
```

## 类型

```ts
interface RunResult {
  runId: string;
  output: string;
  steps: Step[];
  threadId: string;
}

interface Step {
  type: 'plan' | 'skill' | 'tool' | 'observe' | 'final' | 'guardrail' | 'delegation';
  iteration: number;
  agent?: string;
  childRunId?: string;
  steps?: Step[];
  [key: string]: unknown;
}

type AgentStreamEvent =
  | { event: 'delta'; data: { content: string } }
  | { event: 'step'; data: Step }
  | { event: 'done'; data: RunResult };
```
