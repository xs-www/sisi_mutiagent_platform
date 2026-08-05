# router.ts

- 源文件：`apps/backend/src/modules/llm/router.ts`
- 文件职责：平台模型路由：按优先级挑选可用模型、调度各 provider 调用，并记录 token 用量。
- 具名函数/方法：8 个

## 函数与方法

### `filterKeysByModel`（第 16 行）

- 类型：函数
- 签名：`function filterKeysByModel<T extends { id: string; maxConcurrency: number; models: string[] }>(keys: T[], modelName: string): T[]`
- 功能：过滤出可用于指定模型的 Key（models 为空表示任意模型）。
- 行为提示：未识别到显著的外部副作用。
- 说明：本次改为泛型签名，保留入参原始类型（含 `apiKey`），修复 `resolveApiKey` 中 `keys[0].apiKey` 的类型错误。

### `providerDefaultModel`（第 21 行）

- 类型：函数
- 签名：`function providerDefaultModel(provider: string): string | null`
- 功能：返回 provider 的默认模型名，无配置时返回 null。
- 行为提示：未识别到显著的外部副作用。

### `dedupeCandidates`（第 26 行）

- 类型：函数
- 签名：`function dedupeCandidates(items: CandidateModel[]): CandidateModel[]`
- 功能：按 `provider::modelName` 去重候选模型。
- 行为提示：未识别到显著的外部副作用。

### `hasAvailableApiKey`（第 38 行）

- 类型：函数
- 签名：`async function hasAvailableApiKey(provider: string): Promise<boolean>`
- 功能：检查 provider 是否存在未被并发占满的 chat 类 Key。
- 行为提示：包含异步操作。

### `buildPreferredCandidates`（第 47 行）

- 类型：函数
- 签名：`async function buildPreferredCandidates(): Promise<CandidateModel[]>`
- 功能：构建候选模型列表：平台模型池 + API Key 隐式候选，外部可用优先、Ollama 兜底。
- 行为提示：包含异步操作。

### `chatWithPlatformModels`（第 99 行）

- 类型：函数
- 签名：`export async function chatWithPlatformModels( messages: ChatMessage[], options?: { temperature?: number }, meta?: { projectId?: string; ticketId?: string; agentId?: string } ): Promise<ChatResponse>`
- 功能：按优先级依次尝试平台模型池，返回首个成功的响应。
- 行为提示：包含异步操作；可能抛出异常。
- 说明：本次新增可选 `meta` 参数（归属上下文）。调用成功后若响应含 `usage`，则写入 `token_usage` 表（`recordTokenUsage`），记录 provider、模型与缓存命中/未命中/输出细分；不传 `meta` 时记为平台级消耗（project_id 为 NULL）。写库失败仅打日志，不影响调用主流程。

### `callModel`（第 146 行）

- 类型：函数
- 签名：`async function callModel( provider: string, modelName: string, messages: ChatMessage[], options?: { temperature?: number } ): Promise<ChatResponse>`
- 功能：调用单个模型：Ollama 走本地通道，外部 provider 解析并占用/释放并发 Key。
- 行为提示：包含异步操作；可能抛出异常。

### `resolveApiKey`（第 206 行）

- 类型：函数
- 签名：`async function resolveApiKey(provider: string, modelName?: string): Promise<string>`
- 功能：解析 API Key：优先按模型过滤 Key 池，回退任意 chat Key，最后兜底配置文件。
- 行为提示：包含异步操作。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
