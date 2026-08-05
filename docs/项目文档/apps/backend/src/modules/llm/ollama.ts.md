# ollama.ts

- 源文件：`apps/backend/src/modules/llm/ollama.ts`
- 文件职责：实现 Ollama 本地模型服务的状态检查、模型管理与对话调用。
- 具名函数/方法：5 个

## 函数与方法

### `checkOllamaStatus`（第 8 行）

- 类型：函数
- 签名：`export async function checkOllamaStatus(): Promise<OllamaStatus>`
- 功能：检查 Ollama 服务是否可用并返回已加载模型列表。
- 行为提示：包含异步操作；访问 HTTP/API。

### `listModels`（第 26 行）

- 类型：函数
- 签名：`export async function listModels(): Promise<ModelInfo[]>`
- 功能：读取或查询 Ollama 已安装模型列表。
- 行为提示：包含异步操作；访问 HTTP/API。

### `pullModel`（第 36 行）

- 类型：函数
- 签名：`export async function pullModel(modelName: string): Promise<boolean>`
- 功能：触发 Ollama 拉取指定模型，返回是否成功。
- 行为提示：包含异步操作；访问 HTTP/API。

### `chat`（第 46 行）

- 类型：函数
- 签名：`export async function chat( model: string, messages: ChatMessage[], options?: { temperature?: number; stream?: boolean } ): Promise<ChatResponse>`
- 功能：调用 Ollama `/api/chat` 获取非流式响应。
- 行为提示：包含异步操作；访问 HTTP/API。
- 说明：本次改动在返回前附加 `usage` 细分字段——Ollama 无缓存概念，输入全部按未命中统计（`inputCacheHitTokens: 0`，`inputCacheMissTokens = prompt_eval_count`），输出单独统计（`outputTokens = eval_count`），供上层统一落库。

### `chatStream`（第 69 行）

- 类型：生成器函数
- 签名：`export async function* chatStream( model: string, messages: ChatMessage[], options?: { temperature?: number } ): AsyncGenerator<string, void, unknown>`
- 功能：调用 Ollama 流式接口，逐块产出消息内容。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
