# short-term.ts

- 源文件：`apps/backend/src/modules/memory/short-term.ts`
- 文件职责：实现短期记忆（对话缓冲）管理器。按 Agent + Session 维度维护滑动窗口式的消息缓冲，自动基于 token 估算进行裁剪（FIFO）。
- 具名函数/方法/接口/常量：10 个

## 接口与类型

### `ShortTermMessage`（第 3 行）
- 类型：接口
- 字段：`role`('user'|'agent'|'system'), `content`(string), `timestamp`(number)
- 功能：单条短期消息的数据结构。

### `ConversationBuffer`（第 9 行）
- 类型：接口
- 字段：`messages`(ShortTermMessage[]), `estimatedTokens`(number)
- 功能：单个会话的消息缓冲与预估 token 消耗。

## 函数与方法

### `ShortTermMemoryManager.constructor`（第 19 行）
- 类型：构造函数
- 签名：`constructor(maxTokens?: number = 4000)`
- 功能：初始化短期记忆管理器；默认 token 上限 4000，按 0.25 token/字符 估算。

### `ShortTermMemoryManager.addMessage`（第 24 行）
- 类型：方法
- 签名：`addMessage(agentId: string, sessionId: string, role: string, content: string): void`
- 功能：向指定 Agent 的指定会话追加一条消息，更新 token 估算后自动触发裁剪。
- 边缘条件：触发 `trim()` 确保缓冲不超上限。

### `ShortTermMemoryManager.getContext`（第 43 行）
- 类型：方法
- 签名：`getContext(agentId: string, sessionId: string): ShortTermMessage[]`
- 功能：获取指定会话的原始消息列表。
- 边缘条件：buffer 不存在时返回空数组。

### `ShortTermMemoryManager.getFormattedContext`（第 48 行）
- 类型：方法
- 签名：`getFormattedContext(agentId: string, sessionId: string): string`
- 功能：将短期记忆格式化为 Prompt 可用的文本（`## 近期对话`），按时间戳、角色（用户/Agent/系统）排列。
- 边缘条件：无消息时返回空串。

### `ShortTermMemoryManager.clear`（第 67 行）
- 类型：方法
- 签名：`clear(agentId: string, sessionId?: string): void`
- 功能：清除记忆。传入 `sessionId` 时删除单个会话；否则删除该 Agent 的全部会话。
- 边缘条件：会话删除后若 `sessions` Map 为空，同步清理 agent 条目。

### `ShortTermMemoryManager.getTokenCount`（第 81 行）
- 类型：方法
- 签名：`getTokenCount(agentId: string, sessionId: string): number`
- 功能：返回指定会话的预估 token 数。

### `ShortTermMemoryManager.setMaxTokens`（第 86 行）
- 类型：方法
- 签名：`setMaxTokens(n: number): void`
- 功能：动态调整 token 上限，并对所有现有缓冲重新裁剪。

### `ShortTermMemoryManager.getOrCreateBuffer`（第 95 行）
- 类型：方法（私有）
- 功能：获取或创建两级嵌套 Map 中的 `ConversationBuffer`。

### `ShortTermMemoryManager.trim`（第 114 行）
- 类型：方法（私有）
- 功能：当缓冲的 estimatedTokens 超过 maxTokens 时，从头部逐条移除消息（FIFO），确保不超限。

## 导出的单例

### `shortTermMemory`（第 130 行）
- 类型：常量（ShortTermMemoryManager 实例）
- 功能：应用级单例，默认 maxTokens=4000。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
