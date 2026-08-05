# long-term.ts

- 源文件：`apps/backend/src/modules/memory/long-term.ts`
- 文件职责：实现长期记忆管理器。依赖 `IEmbeddingProvider` 生成文本向量、`IVectorStore` 持久化存储，支持存储去重（基于余弦相似度阈值）、语义检索和格式化输出。
- 具名函数/方法：7 个

## 函数与方法

### `LongTermMemoryManager.constructor`（第 13 行）
- 类型：构造函数
- 签名：`constructor(options: { embeddingProvider, vectorStore, dedupThreshold?, retrievalThreshold?, defaultTopK? })`
- 功能：初始化长期记忆管理器。
  - `dedupThreshold` 默认 0.95（余弦相似度超过此值视为重复）
  - `retrievalThreshold` 默认 0.5（检索结果过滤阈值）
  - `defaultTopK` 默认 5（检索返回最大条数）

### `LongTermMemoryManager.store`（第 27 行）
- 类型：方法
- 签名：`store(agentId: string, content: string, metadata?: Record<string, any>): Promise<{ id: string; existed: boolean }>`
- 功能：存储长期记忆。流程：生成 embedding → 与已有记录逐一比较余弦相似度 → 超过 `dedupThreshold` 视为重复（返回已有 ID）→ 未重复则写入向量存储并同步调用 `manager.addMemory` 写入 `agent_memories` 表。
- 边缘条件：embedding 或数据库写入失败时抛出 `Error("Failed to store long-term memory")`。
- 行为提示：网络请求（生成 embedding），读写数据库。

### `LongTermMemoryManager.retrieve`（第 60 行）
- 类型：方法
- 签名：`retrieve(agentId: string, query: string, topK?: number): Promise<SearchResult[]>`
- 功能：语义检索长期记忆。生成查询向量 → 搜索 → 按 `retrievalThreshold` 过滤低分结果。
- 边缘条件：检索失败时抛出 `Error("Failed to retrieve long-term memory")`。

### `LongTermMemoryManager.retrieveFormatted`（第 79 行）
- 类型：方法
- 签名：`retrieveFormatted(agentId: string, query: string, topK?: number): Promise<string>`
- 功能：将检索结果格式化为 Prompt 文本格式（`## 长期记忆（相关上下文）`），每条记忆附带相似度分数。
- 边缘条件：无结果时返回空串。

### `LongTermMemoryManager.delete`（第 94 行）
- 类型：方法
- 签名：`delete(id: string): boolean`
- 功能：删除单条长期记忆。
- 行为提示：读写数据库。

### `LongTermMemoryManager.clearAgent`（第 98 行）
- 类型：方法
- 签名：`clearAgent(agentId: string): number`
- 功能：清除指定 Agent 的全部长期记忆。
- 行为提示：读写数据库。

### `LongTermMemoryManager.getCount`（第 102 行）
- 类型：方法
- 签名：`getCount(agentId: string): number`
- 功能：获取指定 Agent 的长期记忆条目数。
- 行为提示：只读数据库。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
