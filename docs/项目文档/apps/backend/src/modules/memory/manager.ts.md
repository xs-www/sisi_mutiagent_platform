# manager.ts

- 源文件：`apps/backend/src/modules/memory/manager.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：9 个

## 函数与方法

### `addMemory`（第 6 行）

- 类型：函数
- 签名：`export function addMemory(input: CreateMemoryInput): AgentMemory`
- 功能：创建或注册 memory 数据。
- 行为提示：读写数据库。

### `getMemoryById`（第 18 行）

- 类型：函数
- 签名：`export function getMemoryById(id: string): AgentMemory | null`
- 功能：读取或查询 memory by id 数据并返回结果。
- 行为提示：读写数据库。

### `getGlobalMemories`（第 25 行）

- 类型：函数
- 签名：`export function getGlobalMemories(agentId: string): AgentMemory[]`
- 功能：读取或查询 global memories 数据并返回结果。
- 行为提示：读写数据库。

### `getProjectMemories`（第 31 行）

- 类型：函数
- 签名：`export function getProjectMemories(agentId: string, projectId: string): AgentMemory[]`
- 功能：读取或查询 project memories 数据并返回结果。
- 行为提示：读写数据库。

### `getAllMemories`（第 37 行）

- 类型：函数
- 签名：`export function getAllMemories(agentId: string, projectId?: string):`
- 功能：读取或查询 all memories 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `deleteMemory`（第 44 行）

- 类型：函数
- 签名：`export function deleteMemory(id: string): boolean`
- 功能：删除或清理 memory 相关资源。
- 行为提示：读写数据库。

### `clearProjectMemories`（第 50 行）

- 类型：函数
- 签名：`export function clearProjectMemories(agentId: string, projectId: string): number`
- 功能：删除或清理 project memories 相关资源。
- 行为提示：读写数据库。

### `formatMemoriesForPrompt`（第 57 行）

- 类型：函数
- 签名：`export function formatMemoriesForPrompt(agentId: string, projectId?: string): string`
- 功能：构建或格式化 memories for prompt。
- 行为提示：未识别到显著的外部副作用。

### `mapRow`（第 78 行）

- 类型：函数
- 签名：`function mapRow(row: any): AgentMemory`
- 功能：将 map row 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
