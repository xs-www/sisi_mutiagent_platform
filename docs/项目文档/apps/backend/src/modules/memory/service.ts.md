# service.ts

- 源文件：`apps/backend/src/modules/memory/service.ts`
- 文件职责：对上层暴露的统一记忆服务门面。组合 `ShortTermMemoryManager` 和 `LongTermMemoryManager`，提供构建 Prompt 上下文、记录交互、增删查记忆等一站式方法。导出全局单例 `memoryService`。
- 具名函数/方法/常量：8 个

## 函数与方法

### `MemoryService.constructor`（第 14 行）
- 类型：构造函数
- 签名：`constructor(options?: { shortTermMaxTokens?, longTermDedupThreshold?, longTermRetrievalThreshold?, longTermTopK? })`
- 功能：初始化 MemoryService，创建短期记忆和长期记忆管理器实例，默认短期 maxTokens=4000。
- 行为提示：创建 `createEmbeddingProvider()` 和 `SQLiteVectorStore()` 依赖。

### `MemoryService.getContextForPrompt`（第 36 行）
- 类型：方法
- 签名：`getContextForPrompt(agentId: string, sessionId: string, currentQuery?: string): Promise<string>`
- 功能：将短期记忆和长期记忆合并为一段 Prompt 上下文文本（格式：`## 记忆` 下含短期对话和长期相关记忆）。
- 边缘条件：两种记忆均为空时返回 `（暂无相关记忆）`；长期记忆检索失败时静默跳过（`console.warn`）继续返回短期记忆。

### `MemoryService.recordInteraction`（第 71 行）
- 类型：方法
- 签名：`recordInteraction(agentId: string, sessionId: string, role: 'user'|'agent'|'system', content: string): Promise<void>`
- 功能：记录一次交互到短期记忆；若为 agent/system 角色且内容 > 50 字符，同时异步写入长期记忆（不阻塞，失败仅 `console.error`）。
- 边缘条件：长期记忆存储失败不影响短期记忆写入。

### `MemoryService.addMemory`（第 88 行）
- 类型：方法
- 签名：`addMemory(agentId: string, content: string, metadata?: Record<string, any>): Promise<string>`
- 功能：直接添加一条长期记忆（委托 `longTerm.store`），返回记录 ID。

### `MemoryService.searchMemories`（第 97 行）
- 类型：方法
- 签名：`searchMemories(agentId: string, query: string, topK?: number): Promise<SearchResult[]>`
- 功能：语义搜索长期记忆。

### `MemoryService.deleteMemory`（第 105 行）
- 类型：方法
- 签名：`deleteMemory(id: string): boolean`
- 功能：删除单条长期记忆。

### `MemoryService.clearShortTerm`（第 109 行）
- 类型：方法
- 签名：`clearShortTerm(agentId: string, sessionId?: string): void`
- 功能：清除指定 Agent/会话的短期记忆。

### `MemoryService.clearLongTerm`（第 113 行）
- 类型：方法
- 签名：`clearLongTerm(agentId: string): number`
- 功能：清除指定 Agent 的全部长期记忆。

## 导出的单例

### `memoryService`（第 119 行）
- 类型：常量（MemoryService 实例）
- 功能：应用级全局单例，供 Agent 执行管道统一引用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
