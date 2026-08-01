# skill.ts

- 源文件：`apps/frontend/src/api/skill.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：7 个

## 函数与方法

### `getSkillPacks`（第 4 行）

- 类型：函数
- 签名：`export async function getSkillPacks(): Promise<SkillPack[]>`
- 功能：读取或查询 skill packs 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getSkillPack`（第 9 行）

- 类型：函数
- 签名：`export async function getSkillPack(id: string): Promise<SkillPack>`
- 功能：读取或查询 skill pack 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `createSkillPack`（第 14 行）

- 类型：函数
- 签名：`export async function createSkillPack(input: CreateSkillPackInput): Promise<SkillPack>`
- 功能：创建或注册 skill pack 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `importSkillPackFile`（第 19 行）

- 类型：函数
- 签名：`export async function importSkillPackFile(input:`
- 功能：实现 import skill pack file 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getSkillPackDownloadUrl`（第 39 行）

- 类型：函数
- 签名：`export function getSkillPackDownloadUrl(id: string): string`
- 功能：读取或查询 skill pack download url 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `updateSkillPack`（第 43 行）

- 类型：函数
- 签名：`export async function updateSkillPack(id: string, input: UpdateSkillPackInput): Promise<SkillPack>`
- 功能：更新并保存 skill pack 状态或数据。
- 行为提示：包含异步操作。

### `deleteSkillPack`（第 48 行）

- 类型：函数
- 签名：`export async function deleteSkillPack(id: string): Promise<void>`
- 功能：删除或清理 skill pack 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
