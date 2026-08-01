# router.ts

- 源文件：`apps/backend/src/modules/llm/router.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：7 个

## 函数与方法

### `providerDefaultModel`（第 15 行）

- 类型：函数
- 签名：`function providerDefaultModel(provider: string): string | null`
- 功能：实现 provider default model 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `dedupeCandidates`（第 21 行）

- 类型：函数
- 签名：`function dedupeCandidates(items: CandidateModel[]): CandidateModel[]`
- 功能：实现 dedupe candidates 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `hasAvailableApiKey`（第 33 行）

- 类型：函数
- 签名：`async function hasAvailableApiKey(provider: string): Promise<boolean>`
- 功能：检查 available api key 是否满足约束。
- 行为提示：包含异步操作。

### `buildPreferredCandidates`（第 42 行）

- 类型：函数
- 签名：`async function buildPreferredCandidates(): Promise<CandidateModel[]>`
- 功能：构建或格式化 preferred candidates。
- 行为提示：包含异步操作。

### `chatWithPlatformModels`（第 92 行）

- 类型：函数
- 签名：`export async function chatWithPlatformModels( messages: ChatMessage[], options?:`
- 功能：实现 chat with platform models 相关的业务逻辑。
- 行为提示：包含异步操作；可能抛出异常。

### `callModel`（第 120 行）

- 类型：函数
- 签名：`async function callModel( provider: string, modelName: string, messages: ChatMessage[], options?:`
- 功能：实现 call model 相关的业务逻辑。
- 行为提示：包含异步操作；可能抛出异常。

### `resolveApiKey`（第 179 行）

- 类型：函数
- 签名：`async function resolveApiKey(provider: string): Promise<string>`
- 功能：实现 resolve api key 相关的业务逻辑。
- 行为提示：包含异步操作。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
