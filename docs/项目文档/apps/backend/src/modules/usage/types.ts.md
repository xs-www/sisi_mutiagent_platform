# types.ts

- 源文件：`apps/backend/src/modules/usage/types.ts`
- 文件职责：声明 Token 用量模块的类型与入参结构；没有具名可执行函数。
- 具名函数/方法：0 个

## 类型与接口

### `TokenUsageRecord`

- 结构：`{ id; projectId?; ticketId?; agentId?; provider; model; purpose; inputCacheHitTokens; inputCacheMissTokens; cacheWriteTokens; outputTokens; totalTokens; createdAt }`
- 说明：`token_usage` 表一行记录的映射；`totalTokens` 为四项之和。

### `RecordTokenUsageInput`

- 结构：`{ projectId?; ticketId?; agentId?; provider: string; model: string; purpose?: string; inputCacheHitTokens?: number; inputCacheMissTokens?: number; cacheWriteTokens?: number; outputTokens?: number }`
- 说明：记录一次 LLM 调用用量的入参；`purpose` 默认 `'chat'`，各 token 字段可选（缺省按 0）。

### `ProjectUsageSummary`

- 结构：`{ projectId: string | null; projectName?: string; callCount; inputCacheHitTokens; inputCacheMissTokens; cacheWriteTokens; outputTokens; totalTokens }`
- 说明：单个项目的用量聚合结果；`projectId` 为 null 表示平台级消耗。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
