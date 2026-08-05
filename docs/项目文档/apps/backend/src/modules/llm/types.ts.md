# types.ts

- 源文件：`apps/backend/src/modules/llm/types.ts`
- 文件职责：声明类型、常量或模块导出；没有具名可执行函数。
- 具名函数/方法：0 个

## 类型与接口

### `ChatMessage`

- 结构：`{ role: 'system' | 'user' | 'assistant'; content: string }`
- 说明：LLM 对话消息结构，用于各 provider 请求体与 ReAct Prompt 构建。

### `ChatRequest`

- 结构：`{ model: string; messages: ChatMessage[]; stream?: boolean; options?: { temperature?; top_p?; num_ctx? } }`
- 说明：聊天请求结构。

### `TokenUsageDetail`（本次新增）

- 结构：`{ inputCacheHitTokens: number; inputCacheMissTokens: number; cacheWriteTokens: number; outputTokens: number }`
- 说明：归一化后的 token 用量细分，统一各 provider 缓存字段差异：
  - `inputCacheHitTokens`：输入中命中缓存的 tokens（按缓存折扣价计费）；
  - `inputCacheMissTokens`：输入中未命中缓存的 tokens（按标准输入价计费）；
  - `cacheWriteTokens`：写入缓存消耗的 tokens（Anthropic 显式缓存 / OpenAI cache_write 才有值）；
  - `outputTokens`：输出 tokens（输出无缓存概念）。

### `ChatResponse`

- 结构：`{ model; message: { role: 'assistant'; content: string }; done: boolean; total_duration?; load_duration?; prompt_eval_count?; eval_count?; usage?: TokenUsageDetail }`
- 说明：统一模型响应；`usage`（本次新增）为 token 用量细分，外部 provider 与 Ollama 通道均已填充。

### `ModelInfo` / `OllamaStatus`

- 说明：Ollama 模型信息与运行状态结构，未变更。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
