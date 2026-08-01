# loader.ts

- 源文件：`apps/backend/src/modules/agent/loader.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：13 个

## 函数与方法

### `getAgentsDir`（第 9 行）

- 类型：函数
- 签名：`function getAgentsDir(): string`
- 功能：读取或查询 agents dir 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getAgentDir`（第 13 行）

- 类型：函数
- 签名：`function getAgentDir(agentId: string): string`
- 功能：读取或查询 agent dir 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `parseMarkdownAgent`（第 27 行）

- 类型：函数
- 签名：`function parseMarkdownAgent(markdown: string, agentId: string): AgentConfig | null`
- 功能：解析 markdown agent，转换为内部可用结构。
- 行为提示：未识别到显著的外部副作用。

### `readMarkdownAgent`（第 105 行）

- 类型：函数
- 签名：`function readMarkdownAgent(agentId: string): AgentConfig | null`
- 功能：实现 read markdown agent 相关的业务逻辑。
- 行为提示：访问文件系统。

### `writeAgentFiles`（第 116 行）

- 类型：函数
- 签名：`function writeAgentFiles(agentConfig: AgentConfig):`
- 功能：更新并保存 agent files 状态或数据。
- 行为提示：访问文件系统。

### `loadAgentConfig`（第 154 行）

- 类型：函数
- 签名：`export function loadAgentConfig(agentId: string): AgentConfig | null`
- 功能：读取或查询 agent config 数据并返回结果。
- 行为提示：访问文件系统。

### `loadAllAgents`（第 187 行）

- 类型：函数
- 签名：`export function loadAllAgents(): AgentConfig[]`
- 功能：读取或查询 all agents 数据并返回结果。
- 行为提示：访问文件系统。

### `syncAgentsToDb`（第 209 行）

- 类型：函数
- 签名：`export function syncAgentsToDb(): void`
- 功能：实现 sync agents to db 相关的业务逻辑。
- 行为提示：读写数据库。

### `getAgentFromDb`（第 230 行）

- 类型：函数
- 签名：`export function getAgentFromDb(agentId: string): Agent | null`
- 功能：读取或查询 agent from db 数据并返回结果。
- 行为提示：读写数据库。

### `getAllAgentsFromDb`（第 254 行）

- 类型：函数
- 签名：`export function getAllAgentsFromDb(): Agent[]`
- 功能：读取或查询 all agents from db 数据并返回结果。
- 行为提示：读写数据库。

### `createAgentConfig`（第 272 行）

- 类型：函数
- 签名：`export function createAgentConfig(agentConfig: AgentConfig): Agent`
- 功能：创建或注册 agent config 数据。
- 行为提示：读写数据库；可能抛出异常。

### `deleteAgentConfig`（第 297 行）

- 类型：函数
- 签名：`export function deleteAgentConfig(agentId: string): boolean`
- 功能：删除或清理 agent config 相关资源。
- 行为提示：读写数据库。

### `updateAgentConfig`（第 311 行）

- 类型：函数
- 签名：`export function updateAgentConfig(agentId: string, updates: Partial<AgentConfig>): Agent | null`
- 功能：更新并保存 agent config 状态或数据。
- 行为提示：读写数据库。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
