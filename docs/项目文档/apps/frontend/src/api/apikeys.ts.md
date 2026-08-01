# apikeys.ts

- 源文件：`apps/frontend/src/api/apikeys.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：5 个

## 函数与方法

### `getApiKeys`（第 4 行）

- 类型：函数
- 签名：`export async function getApiKeys(): Promise<ApiKey[]>`
- 功能：读取或查询 api keys 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getApiKey`（第 9 行）

- 类型：函数
- 签名：`export async function getApiKey(id: string): Promise<ApiKey>`
- 功能：读取或查询 api key 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `createApiKey`（第 14 行）

- 类型：函数
- 签名：`export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKey>`
- 功能：创建或注册 api key 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `updateApiKey`（第 19 行）

- 类型：函数
- 签名：`export async function updateApiKey(id: string, input: UpdateApiKeyInput): Promise<ApiKey>`
- 功能：更新并保存 api key 状态或数据。
- 行为提示：包含异步操作。

### `deleteApiKey`（第 24 行）

- 类型：函数
- 签名：`export async function deleteApiKey(id: string): Promise<void>`
- 功能：删除或清理 api key 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
