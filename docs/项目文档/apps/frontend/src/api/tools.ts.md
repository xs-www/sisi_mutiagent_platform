# tools.ts

- 源文件：`apps/frontend/src/api/tools.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：8 个

## 函数与方法

### `getToolDefinitions`（第 4 行）

- 类型：函数
- 签名：`export async function getToolDefinitions(): Promise<ToolDefinition[]>`
- 功能：读取或查询 tool definitions 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getToolDefinition`（第 9 行）

- 类型：函数
- 签名：`export async function getToolDefinition(name: string): Promise<ToolDefinition>`
- 功能：读取或查询 tool definition 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `executeToolDirect`（第 14 行）

- 类型：函数
- 签名：`export async function executeToolDirect(body:`
- 功能：执行 tool direct 工作流并返回处理结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `executeTool`（第 23 行）

- 类型：函数
- 签名：`export async function executeTool(body:`
- 功能：执行 tool 工作流并返回处理结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `executeApprovedTool`（第 35 行）

- 类型：函数
- 签名：`export async function executeApprovedTool(body:`
- 功能：执行 approved tool 工作流并返回处理结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `updateToolConfig`（第 44 行）

- 类型：函数
- 签名：`export async function updateToolConfig( toolName: string, body:`
- 功能：更新并保存 tool config 状态或数据。
- 行为提示：包含异步操作。

### `createToolDefinition`（第 52 行）

- 类型：函数
- 签名：`export async function createToolDefinition(body: ToolDefinition): Promise<ToolDefinition>`
- 功能：创建或注册 tool definition 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `deleteToolDefinition`（第 57 行）

- 类型：函数
- 签名：`export async function deleteToolDefinition(toolName: string): Promise<void>`
- 功能：删除或清理 tool definition 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
