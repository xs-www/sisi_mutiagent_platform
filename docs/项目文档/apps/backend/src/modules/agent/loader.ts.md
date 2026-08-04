# loader.ts

- 源文件：`apps/backend/src/modules/agent/loader.ts`
- 文件职责：实现 Agent 配置的加载、迁移、写入与数据库同步，支持内置（builtin）与用户自定义（custom）双命名空间及新文件格式（agent.yaml / prompt.md / tools.yaml）。
- 具名函数/方法：17 个

## 导出常量与类型

- `AGENT_NAMESPACES`：`['builtin', 'custom']`，Agent 命名空间枚举（内置 / 用户自定义）。
- `AgentNamespace`：`'builtin' | 'custom'` 联合类型。

## 函数与方法

### `getAgentsRoot`（第 21 行）

- 类型：函数
- 签名：`function getAgentsRoot(): string`
- 功能：返回 Agent 根目录 `data/agents`。
- 行为提示：访问文件系统。

### `getNamespaceDir`（第 25 行）

- 类型：函数
- 签名：`function getNamespaceDir(namespace: AgentNamespace): string`
- 功能：返回指定命名空间目录 `data/agents/<namespace>`。
- 行为提示：访问文件系统。

### `getAgentDir`（第 29 行）

- 类型：函数
- 签名：`function getAgentDir(agentId: string): string | null`
- 功能：按 builtin → custom 顺序查找 agent 目录，找到即返回，否则返回 `null`。
- 行为提示：访问文件系统；路径不存在时返回 `null`。

### `getAgentNamespace`（第 39 行）

- 类型：函数
- 签名：`function getAgentNamespace(agentDir: string): AgentNamespace`
- 功能：根据目录前缀判断所属命名空间（builtin 或 custom）。
- 行为提示：无显著外部副作用。

### `readAgentFromDir`（第 45 行）

- 类型：函数
- 签名：`function readAgentFromDir(agentDir: string, agentId: string): AgentConfig | null`
- 功能：读取新格式 Agent 配置：`agent.yaml` 为基础信息，`prompt.md` 为 system prompt（缺失时回退到 `agent.yaml` 的 `prompt.system`），`tools.yaml` 为工具配置（缺失时回退到 `agent.yaml` 的 `tools`，支持 tools.yaml 直接为工具名数组）。
- 行为提示：访问文件系统；`agent.yaml` 不存在时返回 `null`；未显式声明审批清单时默认对 `file_delete`/`shell_execute` 要求审批。

### `parseMarkdownAgent`（第 110 行）

- 类型：函数
- 签名：`function parseMarkdownAgent(markdown: string, agentId: string): AgentConfig | null`
- 功能：解析旧格式 `<id>.agent.md`（frontmatter + 目标/约束/工作方法/输出格式/拒绝策略 章节），转换为内部结构。
- 行为提示：无显著外部副作用；缺少 `---` 分隔符或 frontmatter 不合法时返回 `null`。

### `readLegacyAgent`（第 188 行）

- 类型：函数
- 签名：`function readLegacyAgent(agentDir: string, agentId: string): AgentConfig | null`
- 功能：读取旧格式 Agent 配置（优先 `<id>.agent.md`，其次 `config.yaml`），用于兼容迁移。
- 行为提示：访问文件系统；两种旧格式均不存在时返回 `null`。

### `writeAgentFiles`（第 219 行）

- 类型：函数
- 签名：`function writeAgentFiles(agentConfig: AgentConfig): { agentDir: string; configPath: string }`
- 功能：以新格式写入 Agent 文件（`agent.yaml` / `prompt.md` / `tools.yaml`）；目录不存在时创建，默认落入 custom 命名空间。
- 行为提示：访问文件系统；覆盖写入。

### `loadAgentConfig`（第 244 行）

- 类型：函数
- 签名：`export function loadAgentConfig(agentId: string): AgentConfig | null`
- 功能：加载 Agent 配置，优先读取新格式；旧格式兜底并自动迁移为新格式。
- 行为提示：访问文件系统；agent 目录不存在时返回 `null`。

### `loadAllAgents`（第 266 行）

- 类型：函数
- 签名：`export function loadAllAgents(): AgentConfig[]`
- 功能：遍历 builtin 与 custom 两个命名空间，加载全部 Agent 配置。
- 行为提示：访问文件系统。

### `getBuiltinAgentIds`（第 291 行）

- 类型：函数
- 签名：`export function getBuiltinAgentIds(): string[]`
- 功能：扫描 `data/agents/builtin/` 目录，返回所有内置 Agent 的 ID 列表（用于项目创建时自动加入成员）。
- 行为提示：访问文件系统；目录不存在时返回空数组。

### `syncAgentsToDb`（第 301 行）

- 类型：函数
- 签名：`export function syncAgentsToDb(): void`
- 功能：将磁盘上的全部 Agent 同步到数据库 `agents` 表（upsert，含 `config_path` 更新）。
- 行为提示：读写数据库。

### `getAgentFromDb`（第 312 行）

- 类型：函数
- 签名：`export function getAgentFromDb(agentId: string): Agent | null`
- 功能：按 id 查询数据库 Agent，并附加磁盘加载的完整配置与 `isBuiltin` 标记。
- 行为提示：读写数据库；数据库或配置缺失时返回 `null`。

### `getAllAgentsFromDb`（第 339 行）

- 类型：函数
- 签名：`export function getAllAgentsFromDb(): Agent[]`
- 功能：查询全部数据库 Agent，附加完整配置与 `isBuiltin` 标记，过滤掉配置缺失项。
- 行为提示：读写数据库。

### `createAgentConfig`（第 359 行）

- 类型：函数
- 签名：`export function createAgentConfig(agentConfig: AgentConfig): Agent`
- 功能：创建 Agent：写入新格式文件（落入 custom 命名空间）并插入数据库；已存在同名 Agent 时抛异常。
- 行为提示：读写数据库；可能抛出异常。

### `deleteAgentConfig`（第 384 行）

- 类型：函数
- 签名：`export function deleteAgentConfig(agentId: string): boolean`
- 功能：删除 Agent 目录（builtin 或 custom）并从数据库移除；目录不存在返回 `false`。
- 行为提示：读写数据库；递归删除文件系统目录。

### `updateAgentConfig`（第 398 行）

- 类型：函数
- 签名：`export function updateAgentConfig(agentId: string, updates: Partial<AgentConfig>): Agent | null`
- 功能：合并更新 Agent 配置，写回新格式文件并更新数据库；`id` 字段不允许修改。
- 行为提示：读写数据库；Agent 不存在时返回 `null`。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
