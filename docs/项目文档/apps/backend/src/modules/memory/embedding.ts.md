# embedding.ts

- 源文件：`apps/backend/src/modules/memory/embedding.ts`
- 文件职责：提供文本向量化（Embedding）能力。封装 OpenAI 兼容 API 的 embedding 调用，支持从平台 Key 池或配置文件动态获取 API Key。
- 具名函数/方法/接口：6 个

## 接口与常量

### `IEmbeddingProvider`（第 8 行）
- 类型：接口
- 方法：`embedText(text: string): Promise<number[]>`, `embedBatch(texts: string[]): Promise<number[][]>`
- 功能：Embedding 提供者的抽象接口。

### `PROVIDER_BASE_URL`（第 4 行）
- 类型：常量（Record<string, string>）
- 功能：Provider 基础 URL 映射表。

## 函数与方法

### `OpenAIEmbeddingProvider.constructor`（第 19 行）
- 类型：构造函数
- 签名：`constructor(options?: { model?: string; apiKey?: string; baseUrl?: string })`
- 功能：初始化 Embedding 提供者，默认模型 `text-embedding-3-small`。

### `OpenAIEmbeddingProvider.embedText`（第 32 行）
- 类型：方法
- 签名：`embedText(text: string): Promise<number[]>`
- 功能：对单条文本生成向量（委托 `embedBatch`，取第一个结果）。
- 边缘条件：`embedBatch` 返回空数组时返回 `[]`（无 Key 场景）。

### `OpenAIEmbeddingProvider.embedBatch`（第 37 行）
- 类型：方法
- 签名：`embedBatch(texts: string[]): Promise<number[][]>`
- 功能：批量生成文本向量。逐个尝试从 Key 池、配置文件获取 API Key 再请求 embedding API。
- 边缘条件：无 API Key 时记录一次警告并返回空数组 `[]`；API 调用失败抛出错误（含 HTTP 状态码和错误信息）；超时 30 秒。
- 行为提示：网络请求，写入控制台日志。

### `OpenAIEmbeddingProvider.logOnceNoEmbeddingKey`（第 25 行）
- 类型：方法（私有）
- 功能：使用静态标记 `warnedNoKey` 确保"缺少 embedding Key"警告仅输出一次。

### `OpenAIEmbeddingProvider.getApiKey`（第 69 行）
- 类型：方法（私有）
- 签名：`getApiKey(): Promise<string>`
- 功能：动态获取 API Key：优先从 `apikeys/repository` 的 `getActiveKeysByCategory('embedding')` 获取，失败则回退到配置文件 `config.llm.providers['openai'].apiKey`。
- 边缘条件：动态 import 失败时静默跳过；两种来源均失败时返回空串。

### `OpenAIEmbeddingProvider.getBaseUrl`（第 91 行）
- 类型：方法（私有）
- 签名：`getBaseUrl(): string`
- 功能：将 chat completions URL 转换为 embeddings URL（替换 `/chat/completions` 为 `/embeddings`）。

### `createEmbeddingProvider`（第 97 行）
- 类型：函数
- 签名：`export function createEmbeddingProvider(options?: { model?: string; apiKey?: string; baseUrl?: string }): IEmbeddingProvider`
- 功能：工厂函数，创建 `OpenAIEmbeddingProvider` 实例。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
