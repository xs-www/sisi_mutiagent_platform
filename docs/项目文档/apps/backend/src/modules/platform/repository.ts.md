# repository.ts

- 源文件：`apps/backend/src/modules/platform/repository.ts`
- 文件职责：数据仓储层：封装持久化数据的查询和变更操作。
- 具名函数/方法：7 个

## 函数与方法

### `createPlatformModel`（第 5 行）

- 类型：函数
- 签名：`export function createPlatformModel(input: CreatePlatformModelInput): PlatformModel`
- 功能：创建或注册 platform model 数据。
- 行为提示：读写数据库。

### `getPlatformModelById`（第 18 行）

- 类型：函数
- 签名：`export function getPlatformModelById(id: string): PlatformModel | null`
- 功能：读取或查询 platform model by id 数据并返回结果。
- 行为提示：读写数据库。

### `getAllPlatformModels`（第 25 行）

- 类型：函数
- 签名：`export function getAllPlatformModels(): PlatformModel[]`
- 功能：读取或查询 all platform models 数据并返回结果。
- 行为提示：读写数据库。

### `getActivePlatformModels`（第 32 行）

- 类型：函数
- 签名：`export function getActivePlatformModels(): PlatformModel[]`
- 功能：读取或查询 active platform models 数据并返回结果。
- 行为提示：读写数据库。

### `updatePlatformModel`（第 38 行）

- 类型：函数
- 签名：`export function updatePlatformModel(id: string, input: UpdatePlatformModelInput): PlatformModel | null`
- 功能：更新并保存 platform model 状态或数据。
- 行为提示：读写数据库。

### `deletePlatformModel`（第 57 行）

- 类型：函数
- 签名：`export function deletePlatformModel(id: string): boolean`
- 功能：删除或清理 platform model 相关资源。
- 行为提示：读写数据库。

### `mapRow`（第 63 行）

- 类型：函数
- 签名：`function mapRow(row: any): PlatformModel`
- 功能：将 map row 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
