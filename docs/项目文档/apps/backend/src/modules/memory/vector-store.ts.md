# vector-store.ts

- 源文件：`apps/backend/src/modules/memory/vector-store.ts`
- 文件职责：提供向量存储与余弦相似度计算的 SQLite 实现。定义 `IVectorStore` 接口与 `SQLiteVectorStore` 类，支撑长期记忆的向量检索与去重。
- 具名函数/方法/接口：8 个

## 接口与类型

### `VectorRecord`（第 5 行）
- 类型：接口
- 字段：`id`(string), `agentId`(string), `vector`(number[]), `content`(string), `metadata`(Record), `createdAt`(string)
- 功能：描述一条向量存储记录的结构。

### `SearchResult`（第 14 行）
- 类型：接口
- 字段：`record`(VectorRecord), `score`(number)
- 功能：封装检索结果，包含匹配记录与相似度分数。

### `IVectorStore`（第 19 行）
- 类型：接口
- 方法：`store`, `search`, `delete`, `deleteByAgent`, `getByAgent`
- 功能：向量存储的抽象接口，便于替换底层存储实现。

## 函数与方法

### `cosineSimilarity`（第 27 行）
- 类型：函数
- 签名：`export function cosineSimilarity(a: number[], b: number[]): number`
- 功能：计算两个向量 a 和 b 的余弦相似度。
- 边缘条件：向量维度不匹配时抛出 `Error("Vector dimension mismatch")`；分母为零（零向量）时返回 0。

### `mapRow`（第 44 行）
- 类型：函数（私有）
- 签名：`function mapRow(row: any): VectorRecord`
- 功能：将数据库行映射为 `VectorRecord` 结构，解析 JSON 字段（vector、metadata）。
- 边缘条件：metadata 为空时兜底为 `{}`。

### `SQLiteVectorStore.store`（第 56 行）
- 类型：方法
- 签名：`store(record: Omit<VectorRecord, 'id' | 'createdAt'>): VectorRecord`
- 功能：将向量记录写入 `memory_vectors` 表，自动生成 UUID 和创建时间。
- 行为提示：读写数据库。

### `SQLiteVectorStore.search`（第 78 行）
- 类型：方法
- 签名：`search(agentId: string, queryVector: number[], topK: number): SearchResult[]`
- 功能：按 agentId 过滤所有向量记录，计算余弦相似度后排序取 topK。
- 行为提示：全量读取 agent 向量后内存排序（非索引检索，大数据量下需注意性能）。

### `SQLiteVectorStore.delete`（第 95 行）
- 类型：方法
- 签名：`delete(id: string): boolean`
- 功能：按 ID 删除单条向量记录。
- 行为提示：读写数据库。返回 `result.changes > 0` 表示是否命中。

### `SQLiteVectorStore.deleteByAgent`（第 101 行）
- 类型：方法
- 签名：`deleteByAgent(agentId: string): number`
- 功能：删除指定 Agent 的所有向量记录。
- 行为提示：读写数据库。返回受影响的记录数。

### `SQLiteVectorStore.getByAgent`（第 109 行）
- 类型：方法
- 签名：`getByAgent(agentId: string): VectorRecord[]`
- 功能：获取指定 Agent 的全部向量记录。
- 行为提示：只读数据库。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
