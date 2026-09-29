# Part3 tasks · Agent Runtime Harness

> 任务板。一节课只执行一条。
> implement = 先读本目录三件套，再贴当前这一条的施工单。施工单正文不改，不追加口语。

| 任务 | 完成标准 |
|------|----------|
| T1 目录骨架 | npm run build 通过；ls -R app/ai 分层完整；demo build:modules 产出 dist/skills/*.js |
| T2 LLM 通路 | curl /api/ai/chat 有回复；curl -N chat/stream 逐字吐出；改 ai.llm.default 一行换厂商仍通；demo 自写 Provider 注册跑通 |
| T3 首个 Skill | 启动日志打出 skill 列表；project-query 返回数据库真项目 |
| T4 Tool + Agent 扫描 | /api/ai/tool/list 与 agent/list 返回注册表；agent 是纯声明无执行逻辑 |
| T5 Orchestrator | POST /api/ai/agent/run 返回 runId+output+steps；steps 可见 skill 调用与轮次 |
| T6 流式协议 · Chat 组件 | agent-chat 逐字渲染；tool-call-card 渲染 step；打 /agent/run/stream 端到端通 |
| T7 Chat 页 · Trace 页 | dashboard Agent 实验室可对话；复制 runId 到 Trace 页回放；框架零改动 |
| T8 MCP 客户端 | demo config 声明 server；Chat steps 出现外部进程 tool，形态同内置 Skill |
| T9 RAG 检索 | fixture 灌库后 Chat 回答带出处；steps 可见检索命中片段；改 ai.rag.chunk 一行重灌，切分粒度跟着变 |
| T10 Thread · Checkpoint | 追问「刚才问什么」能答；重启服务同 threadId 上下文仍在 |
| T11 Guardrail · Eval | 危险输入被拦且 Trace 可见；npm run eval 跑出 pass/fail，eval 页看同一份报告；框架无 /api/ai/eval |
| T12 LangChain · LangGraph | steps 含 planner=langchain 或 node=plan\|execute\|observe；Chat/Trace 页不改 |
| T13 Multi-Agent | 复合任务 steps 可见委派链路；Chat 可见跨 agent 协同 |
| T14 Part3 复盘 | walkthrough 覆盖流式/MCP/RAG/记忆/Guardrail/Trace/Eval/多 Agent；无状态验收通过 |

走偏了回到 spec.md / plan.md，不追加口语 Prompt。
