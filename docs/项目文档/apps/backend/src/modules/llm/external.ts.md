# external.ts

- 源文件：`apps/backend/src/modules/llm/external.ts`
- 文件职责：实现外部 LLM provider 的 HTTP 调用与响应解析。
- 具名函数/方法：6 个

## 函数与方法

### `buildRequestBody`（第 45 行）

- 类型：函数
- 签名：`function buildRequestBody(model: string, messages: ChatMessage[], options?: { temperature?: number })`
- 功能：构建或格式化 OpenAI 兼容接口的请求体（过滤空消息、可选 temperature、Kimi/moonshot 默认 max_tokens）。
- 行为提示：未识别到显著的外部副作用。

### `printError`（第 56 行）

- 类型：函数
- 签名：`function printError(provider: string, error: AxiosError)`
- 功能：格式化输出 provider 调用失败的 HTTP 状态码与响应体。
- 行为提示：未识别到显著的外部副作用。

### `normalizeOpenAICompatibleUsage`（第 62 行）（本次新增）

- 类型：函数
- 签名：`function normalizeOpenAICompatibleUsage(provider: string, usage: any): TokenUsageDetail`
- 功能：归一化 OpenAI 兼容接口的 usage，将各家缓存字段统一为「输入命中 / 输入未命中 / 缓存写入 / 输出」四分：
  - DeepSeek：读取原生 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`；
  - OpenAI / Kimi / Qwen / 百炼：读取 `prompt_tokens_details.cached_tokens` 为命中部分，其余输入按未命中计，另读 `cache_write_tokens`。
- 行为提示：未识别到显著的外部副作用。
- 边缘条件：`usage` 缺失或字段缺失时按 0 兜底；DeepSeek 未命中字段缺失时按 `prompt - hit` 推算；`prompt_cache_miss_tokens` 为 NaN 时同样回退推算。

### `chatOpenAICompatible`（第 91 行）

- 类型：函数
- 签名：`export async function chatOpenAICompatible( provider: string, model: string, messages: ChatMessage[], apiKey: string, options?: { temperature?: number } ): Promise<ChatResponse>`
- 功能：通用 OpenAI 兼容接口调用（openai/kimi/qwen/deepseek/bailian 共用），解析响应与 usage。
- 行为提示：包含异步操作；访问 HTTP/API；可能抛出异常。
- 说明：返回值新增 `usage` 字段（经 `normalizeOpenAICompatibleUsage` 归一化），供上层落库统计缓存命中/未命中与输出。

### `chatOpenAI`（第 127 行）

- 类型：函数
- 签名：`export async function chatOpenAI( model: string, messages: ChatMessage[], apiKey: string, options?: { temperature?: number } ): Promise<ChatResponse>`
- 功能：保留原 chatOpenAI 作为 openai 的别名，转发至 `chatOpenAICompatible`。
- 行为提示：未识别到显著的外部副作用。

### `chatAnthropic`（第 136 行）

- 类型：函数
- 签名：`export async function chatAnthropic( model: string, messages: ChatMessage[], apiKey: string, options?: { temperature?: number } ): Promise<ChatResponse>`
- 功能：调用 Anthropic Messages API：分离 system 消息、构造请求体并解析响应。
- 行为提示：包含异步操作；访问 HTTP/API；可能抛出异常。
- 说明：返回值新增 `usage` 字段——`input_tokens` 即未命中部分、`cache_read_input_tokens` 为命中部分、`cache_creation_input_tokens` 为缓存写入（显式缓存下才有值）。
- 边缘条件：缓存命中前提是请求中携带 `cache_control` 断点；当前实现未注入，命中/写入字段通常为 0。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
