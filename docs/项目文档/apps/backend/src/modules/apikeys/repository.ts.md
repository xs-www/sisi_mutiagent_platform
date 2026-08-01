# repository.ts

- 源文件：`apps/backend/src/modules/apikeys/repository.ts`
- 文件职责：数据仓储层：封装持久化数据的查询和变更操作。
- 具名函数/方法：8 个

## 函数与方法

### `createApiKey`（第 5 行）

- 类型：函数
- 签名：`export function createApiKey(input: CreateApiKeyInput): ApiKey`
- 功能：创建或注册 api key 数据。
- 行为提示：读写数据库。

### `getApiKeyById`（第 18 行）

- 类型：函数
- 签名：`export function getApiKeyById(id: string): ApiKey | null`
- 功能：读取或查询 api key by id 数据并返回结果。
- 行为提示：读写数据库。

### `getAllApiKeys`（第 25 行）

- 类型：函数
- 签名：`export function getAllApiKeys(): ApiKey[]`
- 功能：读取或查询 all api keys 数据并返回结果。
- 行为提示：读写数据库。

### `getActiveApiKeysByProvider`（第 31 行）

- 类型：函数
- 签名：`export function getActiveApiKeysByProvider(provider: string): ApiKey[]`
- 功能：读取或查询 active api keys by provider 数据并返回结果。
- 行为提示：读写数据库。

### `getAllActiveApiKeys`（第 37 行）

- 类型：函数
- 签名：`export function getAllActiveApiKeys(): ApiKey[]`
- 功能：读取或查询 all active api keys 数据并返回结果。
- 行为提示：读写数据库。

### `updateApiKey`（第 43 行）

- 类型：函数
- 签名：`export function updateApiKey(id: string, input: UpdateApiKeyInput): ApiKey | null`
- 功能：更新并保存 api key 状态或数据。
- 行为提示：读写数据库。

### `deleteApiKey`（第 63 行）

- 类型：函数
- 签名：`export function deleteApiKey(id: string): boolean`
- 功能：删除或清理 api key 相关资源。
- 行为提示：读写数据库。

### `mapRow`（第 69 行）

- 类型：函数
- 签名：`function mapRow(row: any): ApiKey`
- 功能：将 map row 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
