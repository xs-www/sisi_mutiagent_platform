# implementations.ts

- 源文件：`apps/backend/src/modules/tools/implementations.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：14 个

## 函数与方法

### `resolveSafePath`（第 13 行）

- 类型：函数
- 签名：`function resolveSafePath(workspacePath: string, userPath: string):`
- 功能：实现 resolve safe path 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `toolFileRead`（第 40 行）

- 类型：函数
- 签名：`export function toolFileRead(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool file read 涉及的数据转换为目标结构。
- 行为提示：访问文件系统。

### `toolFileWrite`（第 65 行）

- 类型：函数
- 签名：`export function toolFileWrite(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool file write 涉及的数据转换为目标结构。
- 行为提示：访问文件系统。

### `toolFileDelete`（第 92 行）

- 类型：函数
- 签名：`export function toolFileDelete(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool file delete 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `toolShellExecute`（第 115 行）

- 类型：函数
- 签名：`export function toolShellExecute(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool shell execute 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `toolHttpRequest`（第 146 行）

- 类型：函数
- 签名：`export async function toolHttpRequest(params: Record<string, any>, _workspacePath: string): Promise<ToolExecutionResult>`
- 功能：将 tool http request 涉及的数据转换为目标结构。
- 行为提示：包含异步操作；访问 HTTP/API。

### `validateStatus`（第 164 行）

- 类型：箭头函数
- 签名：`validateStatus()`
- 功能：检查 status 是否满足约束。
- 行为提示：未识别到显著的外部副作用。

### `toolCodeSearch`（第 182 行）

- 类型：函数
- 签名：`export function toolCodeSearch(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool code search 涉及的数据转换为目标结构。
- 行为提示：访问文件系统。

### `walk`（第 202 行）

- 类型：函数
- 签名：`function walk(dir: string)`
- 功能：实现 walk 相关的业务逻辑。
- 行为提示：访问文件系统。

### `toolGitOperation`（第 254 行）

- 类型：函数
- 签名：`export function toolGitOperation(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool git operation 涉及的数据转换为目标结构。
- 行为提示：访问 HTTP/API。

### `resolveToolProjectId`（第 295 行）

- 类型：函数
- 签名：`export function resolveToolProjectId(params: Record<string, any>, context: ToolExecutionContext): string | undefined`
- 功能：实现 resolve tool project id 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `toolGetProjectMembers`（第 309 行）

- 类型：函数
- 签名：`export function toolGetProjectMembers(params: Record<string, any>, context: ToolExecutionContext): ToolExecutionResult`
- 功能：将 tool get project members 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `toolCreateTicket`（第 324 行）

- 类型：函数
- 签名：`export async function toolCreateTicket(params: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>`
- 功能：将 tool create ticket 涉及的数据转换为目标结构。
- 行为提示：包含异步操作。

### `executeToolImplementation`（第 363 行）

- 类型：函数
- 签名：`export async function executeToolImplementation( toolName: string, params: Record<string, any>, workspacePath: string, context: ToolExecutionContext =`
- 功能：执行 tool implementation 工作流并返回处理结果。
- 行为提示：包含异步操作。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
