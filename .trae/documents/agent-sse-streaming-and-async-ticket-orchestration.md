# Agent 执行分步 UI + 工单/子工单自动推进

## Context（背景）

当前平台两个痛点：

1. **执行 UI 卡顿**：`POST /:id/execute` 是阻塞式 HTTP，跑完整个 ReAct 循环（最多 10 轮）才一次性 `res.json(result)` 返回；前端 `handleExecute` 等全部结束才 `loadMessages()` 一次。后端其实在每步都 `createMessage` 落盘了，但前端执行期间不拉取 → UI 只显示"执行中..."，结束后才跳变为最终态。需要改为 SSE 流式分步更新。

2. **子工单推进不完整**：`orchestration.ts` 已实现 `dispatchChildTicketExecution` 自动执行子工单（含循环派单/成员校验），但**同步阻塞**父工单，且**无父工单状态回写、无失败传播**。todo 文档（`docs/260719todo.md`）要求异步执行 + 可观测性回写。

**用户决策**：①子工单**异步后台执行**（父工单不阻塞）；②**引入 failed/blocked 工单状态**。

预期结果：执行时 UI 逐条实时显示 Thought/Action/Observation；父 Agent 建子工单后立即继续，子工单进后台队列执行，完成后回写父工单；失败有明确状态与按钮兜底。

---

## 任务 1：SSE 流式分步 UI

### 后端

**新建 `apps/backend/src/modules/agent/events.ts`** — 定义 `AgentEvent` 联合类型（start / iteration_start / thought / action / observation / ticket_status / child_dispatched / complete / error）。每个 thought/action/observation 事件携带 `createMessage` 返回的**真实 messageId**（前端流结束后 `loadMessages()` 按此去重防闪烁）。

**`apps/backend/src/modules/agent/executor.ts`** — `ExecutionOptions` 增加 `onEvent?: (e: AgentEvent) => void` 与 `signal?: { aborted: boolean }`（用 AbortController）。每处 `createMessage(...)` 接住返回值后发射对应事件；`updateTicketStatus` 后发射 `ticket_status`；`create_ticket` 分支 `dispatchChildTicketExecution` 返回后发射 `child_dispatched`；循环顶部检查 `signal.aborted`；末尾根据 completed/error 发射 complete/error。**不传 onEvent 时行为与现在完全一致**（向后兼容，队列 worker 复用）。

**`apps/backend/src/modules/agent/routes.ts`** — `POST /:id/execute` 改 SSE：用 `Accept: text/event-stream` 探测——是则走 SSE（设 `Content-Type: text/event-stream`、`Cache-Control: no-cache, no-transform`、`X-Accel-Buffering: no`、`flushHeaders()`，`req.on('close')` 触发 AbortController.abort，`send(event)` 写 `event:`/`data:` 帧，finally `res.end()`），否则保留旧 `res.json` 兼容旧调用。保留 body 校验逻辑不变。

### 前端

**`apps/frontend/src/api/agent.ts`** — 新增 `executeAgentStream(agentId, body, { onEvent, onComplete, onError, signal })`，用 `fetch` + `ReadableStream.getReader()` 解析 SSE。关键健壮性：`buffer` 累积只在完整 `\n\n` 帧解析（处理 chunk 边界）；`TextDecoder({ stream: true })` 处理多字节跨 chunk；多行 `data:` 按 SSE 规范用 `\n` join；`event:` 与 `data:` 任意顺序。保留旧 `executeAgent`。

**`apps/frontend/src/types/index.ts`（或新建 `agent-event.ts`）** — 镜像后端 `AgentEvent` 类型。

**`apps/frontend/src/pages/TicketDetail.tsx`** — `handleExecute` 改用 `executeAgentStream`：
- 维护 `liveMessages` state（初始 = 已加载 messages），收到 thought/action/observation 事件时用事件的**真实 messageId + createdAt** 构造合成 Message 追加。
- 收到 `ticket_status` 事件乐观更新本地 `ticket.status`。
- 收到 `complete`/`error` 后调 `loadMessages()` + `loadTicket()` 用服务端真相整体替换（messageId 对齐不闪烁）。
- 渲染数据源从 `sortedMessages` 切到 `liveMessages` 排序视图（`renderMessage` 已支持全部消息类型，无需改渲染）。
- 新增"停止执行"按钮（AbortController）。
- 执行期间禁用发送消息与状态切换。

**轮询兜底**：`useEffect` 依 `ticket.status` + `executing` 决定——`executing=true`（本地 SSE）不轮询；`status` 为 `in_progress`/`reviewing` 且非本地执行时，每 2.5s `loadTicket()`+`loadMessages()`（覆盖后台子工单执行时子工单页面的可见性）。状态离开后停止。

---

## 任务 2：异步自动推进 + failed/blocked 状态

### 状态机扩展

**`apps/backend/src/types/index.ts`** — `TicketStatus` 加 `'failed' | 'blocked'`。

**`apps/backend/src/modules/ticket/routes.ts`** — 第 105 行 PATCH 状态白名单加 `failed`/`blocked`；新增 `isValidTransition(from,to)` 校验：`failed→pending/in_progress`、`blocked→in_progress/pending`、`completed` 终态不可直接回退（回退走 pending），非法迁移返回 400。

### 失败语义

**`apps/backend/src/modules/agent/executor.ts`** — LLM 失败分支、达到最大迭代、signal 取消三处：`updateTicketStatus(ticketId,'failed')` + 发射 `ticket_status: failed` + 原因写入 error。成功路径不变（complete_ticket→reviewing；finish→不改）。

**`apps/frontend/src/utils/index.ts`** — `TICKET_STATUS_LABEL` 加 `failed:'失败'`、`blocked:'阻塞'`；`TICKET_STATUS_COLOR` 加 `failed:'error'`、`blocked:'warning'`。

**`apps/frontend/src/pages/TicketDetail.tsx`** — `renderStatusButtons`：`failed`→[重置为待处理][重新执行]；`blocked`→[解除阻塞]。

### 异步执行队列

**新建 `apps/backend/src/modules/agent/queue.ts`** — 进程内 FIFO 队列 + 两个计数器 Map：`MAX_PER_AGENT=1`（防同 agent 上下文串扰）、`MAX_PER_PROJECT=2`（防 API Key 打满）。`enqueue(item)` 返回 Promise；`pump()` 在入队与每任务结束时扫描可启动项；`run(item)` 不 await 实现并发。worker 跑完调 `handleChildCompletion`：completed→父工单写"子工单 X 已完成"；未完成/异常→父工单写⚠️风险提示 + 子工单已 failed（executor 内已设）。导出单例 `executionQueue`。

**`apps/backend/src/modules/agent/orchestration.ts`** — 删除第 103-104 行同步 `await executeAgent`。保留全部前置校验，校验通过后 `executionQueue.enqueue({...}).catch(...)`（不 await，不阻塞父工单），写"已入队等待执行"消息，立即 `return { started:true, assigneeId }`。父工单 `executeAction` 的 `create_ticket` 分支 await 几乎瞬时返回，父 ReAct 循环立即继续。

### per-ticket 写入互斥锁

**`apps/backend/src/modules/ticket/repository.ts`** — 新增 `withTicketLock(ticketId, fn)`（Promise 链式锁，`Map<ticketId, Promise>`），包裹 `createMessage`/`updateTicketStatus`/`assignTicket` 的"读-改-写工单文档"操作（内部 `*Unsafe` 实现 + 锁包裹的导出版）。现状写操作同步，锁边际价值有限但防未来异步化丢消息，成本极低。调用方无需改动。

### 父子工单关联展示

**`apps/backend/src/modules/ticket/repository.ts`** — 新增 `getTicketsByParent(parentId)`（`SELECT ... WHERE parent_ticket_id=?`）。

**`apps/backend/src/modules/ticket/routes.ts`** — 新增 `GET /:id/children`，**注册在 `GET /:id` 之前**（避免 Express 把 `children` 当 `:id` 捕获；`/:id/messages`、`/:id/children` 比 `/:id` 更具体会优先匹配，但显式靠前更清晰）。

**`apps/frontend/src/api/ticket.ts`** — 新增 `getChildTickets(parentId)`。

**`apps/frontend/src/pages/TicketDetail.tsx`** — 顶部信息卡片：`parentTicketId` 存在则显示"父工单"跳转链接；新增"子工单"可折叠列表（标题+状态 Tag+跳转）。收到 `child_dispatched` 事件时追加占位项，轮询补全。

---

## 验证（端到端）

**启动**：后端 `apps/backend` dev；前端 `apps/frontend` dev（vite 代理 `/api→:3000`）。

**分步 UI**：建项目+specialist agent+工单 → 详情页点"执行 Agent" → 预期 1-2s 内逐条追加 Thought/Action/Observation（非结束才出现）→ DevTools Network 见 `/execute` 为 `text/event-stream` 多段流 → 点"停止"后当前迭代结束中止、显示"执行已取消" → 流结束后 `loadMessages()` 内容一致无重复。

**异步子工单**：supervisor（带 create_ticket）+ specialist 同项目 → 给 supervisor 拆分工单 → 父 SSE 流很快出现 `child_dispatched`+"已指派"，**父不阻塞**继续后续步骤 → 新标签经子工单链接打开子工单页，status=in_progress 自动 2.5s 轮询，逐条出现后台 agent 写入 → 子工单完成后父工单收到"子工单 X 已完成"系统消息 → 核对验收：子工单 3s 内 in_progress、父可见回写、无重复触发。

**failed 状态**：断网/坏 provider 触发 LLM 失败 → SSE 发 error、状态变 failed、出现[重置为待处理][重新执行] → 重置后重新执行走 SSE → `maxIterations:1` 测最大迭代 failed → 手动 PATCH blocked 测[解除阻塞] → PATCH `completed→in_progress` 应被 400 拒绝。

**并发写入**：同时开父工单页（执行 supervisor）+子工单页（轮询）→ 父流期间子 worker 完成回写父工单 → 流结束 `loadMessages()` 确认父每步消息+子回写**全部存在无丢失**（验证 per-ticket 锁）。

---

## 风险与取舍

1. **SSE 兼容**：用 `Accept` 头探测保留旧 JSON 路径，旧测试/脚本不破。强制 SSE 会破。
2. **vite 代理 SSE**：http-proxy 默认流式转发；若本地测试发现事件累积到结束才到，先直连 :3000 排除代理缓冲。`X-Accel-Buffering` 仅对 nginx 有效。
3. **取消粒度**：signal 仅迭代顶部检测，当前迭代内 LLM 调用不可中断（`chatWithPlatformModels` 未透传 AbortSignal），最坏等一次 LLM 往返。后续增强项。
4. **队列进程内**：重启丢失；多实例需换 Redis 队列。当前假设单进程。
5. **失败传播策略**：子失败只向父写风险提示消息，**不自动 fail 父工单**——保留父 supervisor 自主判断（重试/改派/人工介入）。若要硬失败传播，`handleChildCompletion` 改 `updateTicketStatus(parentId,'blocked')`。
6. **messageId 去重前提**：前端流式追加的合成 Message 必须用后端事件的**真实 messageId**，否则 `loadMessages()` 替换时会闪烁。两端务必对齐。
7. **路由顺序**：`GET /:id/children` 注册在 `GET /:id` 之前。
