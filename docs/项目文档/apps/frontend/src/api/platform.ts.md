# platform.ts

- 源文件：`apps/frontend/src/api/platform.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：4 个

## 函数与方法

### `getPlatformModels`（第 4 行）

- 类型：函数
- 签名：`export async function getPlatformModels(): Promise<PlatformModel[]>`
- 功能：读取或查询 platform models 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `createPlatformModel`（第 9 行）

- 类型：函数
- 签名：`export async function createPlatformModel(input: CreatePlatformModelInput): Promise<PlatformModel>`
- 功能：创建或注册 platform model 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `updatePlatformModel`（第 14 行）

- 类型：函数
- 签名：`export async function updatePlatformModel(id: string, input: UpdatePlatformModelInput): Promise<PlatformModel>`
- 功能：更新并保存 platform model 状态或数据。
- 行为提示：包含异步操作。

### `deletePlatformModel`（第 19 行）

- 类型：函数
- 签名：`export async function deletePlatformModel(id: string): Promise<void>`
- 功能：删除或清理 platform model 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
