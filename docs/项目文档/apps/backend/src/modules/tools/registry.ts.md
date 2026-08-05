# registry.ts

- 源文件：`apps/backend/src/modules/tools/registry.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：10 个

## 常量

### `TOOL_REGISTRY`（第 13 行）
- 类型：`Record<string, ToolDefinition>`
- 功能：平台内置工具注册表。
- 本次改动：新增两个免审批文件工具——`list_files`（列出工作目录文件与子目录，`path?` 可选）与 `file_exists`（检查路径是否存在，`path` 必填）。此前工具集缺少"列目录/判断文件存在"能力，Agent 只能借道 shell（需审批）或 git（白名单受限），导致产物核验困难。

## 函数与方法

### `mapCustomRow`（第 108 行）

- 类型：函数
- 签名：`function mapCustomRow(row: CustomToolRow): ToolDefinition`
- 功能：将 map custom row 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `getCustomToolDefinitions`（第 118 行）

- 类型：函数
- 签名：`export function getCustomToolDefinitions(): ToolDefinition[]`
- 功能：读取或查询 custom tool definitions 数据并返回结果。
- 行为提示：读写数据库。

### `getToolDefinition`（第 128 行）

- 类型：函数
- 签名：`export function getToolDefinition(name: string): ToolDefinition | null`
- 功能：读取或查询 tool definition 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getAllToolDefinitions`（第 132 行）

- 类型：函数
- 签名：`export function getAllToolDefinitions(): ToolDefinition[]`
- 功能：读取或查询 all tool definitions 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getApprovalRequiredTools`（第 136 行）

- 类型：函数
- 签名：`export function getApprovalRequiredTools(): string[]`
- 功能：读取或查询 approval required tools 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getEffectiveToolDefinition`（第 143 行）

- 类型：函数
- 签名：`export function getEffectiveToolDefinition(name: string): ToolDefinition | null`
- 功能：读取或查询 effective tool definition 数据并返回结果。
- 行为提示：读写数据库。

### `getAllEffectiveToolDefinitions`（第 173 行）

- 类型：函数
- 签名：`export function getAllEffectiveToolDefinitions(): ToolDefinition[]`
- 功能：读取或查询 all effective tool definitions 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `createCustomToolDefinition`（第 185 行）

- 类型：函数
- 签名：`export function createCustomToolDefinition(def: ToolDefinition): ToolDefinition`
- 功能：创建或注册 custom tool definition 数据。
- 行为提示：读写数据库。

### `deleteCustomToolDefinition`（第 201 行）

- 类型：函数
- 签名：`export function deleteCustomToolDefinition(toolName: string): boolean`
- 功能：删除或清理 custom tool definition 相关资源。
- 行为提示：读写数据库。

### `setToolOverride`（第 207 行）

- 类型：函数
- 签名：`export function setToolOverride(toolName: string, approvalRequired?: boolean): void`
- 功能：更新并保存 tool override 状态或数据。
- 行为提示：读写数据库。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
