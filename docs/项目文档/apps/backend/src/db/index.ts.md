# index.ts

- 源文件：`apps/backend/src/db/index.ts`
- 文件职责：模块入口：负责初始化、装配或导出模块能力。
- 具名函数/方法：5 个

## 函数与方法

### `hasColumn`（第 9 行）

- 类型：函数
- 签名：`function hasColumn(database: Database.Database, tableName: string, columnName: string): boolean`
- 功能：检查 column 是否满足约束。
- 行为提示：读写数据库。

### `migrateSkillPacksTable`（第 14 行）

- 类型：函数
- 签名：`function migrateSkillPacksTable(database: Database.Database): void`
- 功能：实现 migrate skill packs table 相关的业务逻辑。
- 行为提示：读写数据库。

### `getDb`（第 40 行）

- 类型：函数
- 签名：`export function getDb(): Database.Database`
- 功能：读取或查询 db 数据并返回结果。
- 行为提示：可能抛出异常。

### `initDb`（第 47 行）

- 类型：函数
- 签名：`export function initDb(): Database.Database`
- 功能：实现 init db 相关的业务逻辑。
- 行为提示：读写数据库；访问文件系统。

### `closeDb`（第 80 行）

- 类型：函数
- 签名：`export function closeDb(): void`
- 功能：删除或清理 db 相关资源。
- 行为提示：读写数据库。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
