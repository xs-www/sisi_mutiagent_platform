# repository.ts

- 源文件：`apps/backend/src/modules/skill/repository.ts`
- 文件职责：数据仓储层：封装持久化数据的查询和变更操作。
- 具名函数/方法：10 个

## 函数与方法

### `ensureSkillsDir`（第 10 行）

- 类型：函数
- 签名：`function ensureSkillsDir(): void`
- 功能：实现 ensure skills dir 相关的业务逻辑。
- 行为提示：访问文件系统。

### `getSkillsDirPath`（第 16 行）

- 类型：函数
- 签名：`export function getSkillsDirPath(): string`
- 功能：读取或查询 skills dir path 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `createSkillPack`（第 21 行）

- 类型：函数
- 签名：`export function createSkillPack(input: CreateSkillPackInput): SkillPack`
- 功能：创建或注册 skill pack 数据。
- 行为提示：读写数据库。

### `getSkillPackById`（第 64 行）

- 类型：函数
- 签名：`export function getSkillPackById(id: string): SkillPack | null`
- 功能：读取或查询 skill pack by id 数据并返回结果。
- 行为提示：读写数据库。

### `getAllSkillPacks`（第 71 行）

- 类型：函数
- 签名：`export function getAllSkillPacks(): SkillPack[]`
- 功能：读取或查询 all skill packs 数据并返回结果。
- 行为提示：读写数据库。

### `getActiveSkillPacks`（第 77 行）

- 类型：函数
- 签名：`export function getActiveSkillPacks(): SkillPack[]`
- 功能：读取或查询 active skill packs 数据并返回结果。
- 行为提示：读写数据库。

### `getSkillPacksByIds`（第 83 行）

- 类型：函数
- 签名：`export function getSkillPacksByIds(ids: string[]): SkillPack[]`
- 功能：读取或查询 skill packs by ids 数据并返回结果。
- 行为提示：读写数据库。

### `updateSkillPack`（第 91 行）

- 类型：函数
- 签名：`export function updateSkillPack(id: string, input: UpdateSkillPackInput): SkillPack | null`
- 功能：更新并保存 skill pack 状态或数据。
- 行为提示：读写数据库。

### `deleteSkillPack`（第 110 行）

- 类型：函数
- 签名：`export function deleteSkillPack(id: string): boolean`
- 功能：删除或清理 skill pack 相关资源。
- 行为提示：读写数据库。

### `mapRow`（第 125 行）

- 类型：函数
- 签名：`function mapRow(row: any): SkillPack`
- 功能：将 map row 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
