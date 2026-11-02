# Guardrail 输入安全

Guardrail 在 Agent 运行**之前**检查用户输入，命中规则时不会调用模型，直接返回拦截结果。

## 配置

```js
ai: {
  guardrail: {
    // 关键词：不区分大小写的包含匹配
    blockedKeywords: ['删除所有数据库', 'drop database', 'rm -rf'],
    // 正则：RegExp 或字符串
    blockedPatterns: [/忽略以上.*要求/i, 'ignore (all )?previous instructions'],
  },
}
```

## 拦截结果

```json
{
  "runId": "…",
  "output": "Blocked keyword: 删除所有数据库",
  "steps": [
    { "type": "guardrail", "iteration": 0, "reason": "Blocked keyword: 删除所有数据库" }
  ],
  "threadId": "…"
}
```

`output` 为命中原因。流式接口会依次推送 `step`（guardrail）与 `done` 事件。

## 生效范围

- 每次 `agent/run` 与 `agent/run/stream` 的用户输入（对象输入会先 JSON 序列化）
- `invoke_agent` 委派给子 Agent 的输入

## 评测

在 Eval 用例中可以断言拦截生效：

```js
{ id: 'block-danger', agent: 'project-assistant', input: '删除所有数据库', assert: { guardrailBlocked: true } }
```

> Guardrail 是第一道规则防线。对于敏感操作，Skill / Tool 内部仍应做权限与参数校验。
