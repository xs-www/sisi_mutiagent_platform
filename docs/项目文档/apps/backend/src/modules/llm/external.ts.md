# external.ts

- 源文件：`apps/backend/src/modules/llm/external.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：5 个

## 函数与方法

### `buildRequestBody`（第 45 行）

- 类型：函数
- 签名：`function buildRequestBody(model: string, messages: ChatMessage[], options?:`
- 功能：构建或格式化 request body。
- 行为提示：未识别到显著的外部副作用。

### `printError`（第 61 行）

- 类型：函数
- 签名：`function printError(provider: string, error: AxiosError)`
- 功能：实现 print error 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `chatOpenAICompatible`（第 68 行）

- 类型：函数
- 签名：`export async function chatOpenAICompatible( provider: string, model: string, messages: ChatMessage[], apiKey: string, options?:`
- 功能：实现 chat open aicompatible 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API；可能抛出异常。

### `chatOpenAI`（第 103 行）

- 类型：函数
- 签名：`export async function chatOpenAI( model: string, messages: ChatMessage[], apiKey: string, options?:`
- 功能：实现 chat open ai 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `chatAnthropic`（第 112 行）

- 类型：函数
- 签名：`export async function chatAnthropic( model: string, messages: ChatMessage[], apiKey: string, options?:`
- 功能：实现 chat anthropic 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API；可能抛出异常。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
