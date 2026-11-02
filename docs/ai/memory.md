# 记忆与多轮对话

Elpis 以 **thread（会话线程）** 为单位保存对话历史。同一个 `threadId` 的多次调用会带上之前的上下文。

## 使用

第一次调用不传 `threadId`，框架会生成一个并在结果中返回：

```js
const first = await $curl({
  url: '/api/ai/agent/run',
  data: { agent: 'project-assistant', input: '查询 jd 项目配置' },
});
const { threadId } = first.data;
```

后续调用带上它：

```js
await $curl({
  url: '/api/ai/agent/run',
  data: { agent: 'project-assistant', input: '刚才查的是哪个项目？', threadId },
});
```

不传 `threadId` 时每次都是新会话，相当于无记忆。

## 存储

```js
ai: {
  store: {
    memory: {
      driver: 'file',
      path: './data/memory',   // 默认 .elpis/memory
      maxTurns: 20,            // 带入上下文的最近消息条数，默认 20
    },
  },
}
```

- 每轮对话保存 `user` 与最终 `assistant` 回答两条消息，工具调用过程不进入记忆
- 构建上下文时只取最近 `maxTurns` 条消息，避免超出模型上下文
- 子 Agent（`invoke_agent`）不读取线程记忆，只接收委派时的输入

## threadEnabled

```js
ai: {
  agent: { threadEnabled: true },   // 框架默认 false
}
```

`GET /api/ai/agent/config` 返回 `{ threadEnabled }`，前端据此决定是否在会话中保存并回传 `threadId`：

```js
const { data: cfg } = await $curl({ method: 'get', url: '/api/ai/agent/config' });
let threadId = cfg.threadEnabled ? sessionStorage.getItem('threadId') : undefined;

const res = await $curl({ url: '/api/ai/agent/run', data: { agent, input, threadId } });
if (cfg.threadEnabled) sessionStorage.setItem('threadId', res.data.threadId);
```

## 新建会话

前端丢弃当前 `threadId`，下一次请求不传即可。
