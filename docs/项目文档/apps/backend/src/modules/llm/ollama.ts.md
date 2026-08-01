# ollama.ts

- 源文件：`apps/backend/src/modules/llm/ollama.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：5 个

## 函数与方法

### `checkOllamaStatus`（第 8 行）

- 类型：函数
- 签名：`export async function checkOllamaStatus(): Promise<OllamaStatus>`
- 功能：检查 ollama status 是否满足约束。
- 行为提示：包含异步操作；访问 HTTP/API。

### `listModels`（第 26 行）

- 类型：函数
- 签名：`export async function listModels(): Promise<ModelInfo[]>`
- 功能：读取或查询 models 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `pullModel`（第 36 行）

- 类型：函数
- 签名：`export async function pullModel(modelName: string): Promise<boolean>`
- 功能：实现 pull model 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `chat`（第 46 行）

- 类型：函数
- 签名：`export async function chat( model: string, messages: ChatMessage[], options?:`
- 功能：实现 chat 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `chatStream`（第 61 行）

- 类型：函数
- 签名：`export async function* chatStream( model: string, messages: ChatMessage[], options?:`
- 功能：实现 chat stream 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
