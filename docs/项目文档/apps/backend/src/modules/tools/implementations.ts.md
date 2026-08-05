# implementations.ts

- 源文件：`apps/backend/src/modules/tools/implementations.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：16 个

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

### `toolListFiles`（第 113 行）

- 类型：函数
- 签名：`export function toolListFiles(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：列出工作目录（或指定子路径）下的文件与子目录（不递归），带类型与大小标记。
- 行为提示：访问文件系统。
- 边缘条件：path 省略时列出工作目录根；路径不存在或不是目录时返回失败；空目录返回成功提示。

### `toolFileExists`（第 159 行）

- 类型：函数
- 签名：`export function toolFileExists(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：检查路径是否存在并返回类型（文件/目录）。
- 行为提示：访问文件系统。
- 边缘条件：路径不存在时返回 `success: true` 并提示"路径不存在"，供 Agent 判断产物是否缺失。

### `toolShellExecute`（第 177 行）

- 类型：函数
- 签名：`export function toolShellExecute(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool shell execute 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `toolHttpRequest`（第 208 行）

- 类型：函数
- 签名：`export async function toolHttpRequest(params: Record<string, any>, _workspacePath: string): Promise<ToolExecutionResult>`
- 功能：将 tool http request 涉及的数据转换为目标结构。
- 行为提示：包含异步操作；访问 HTTP/API。

### `validateStatus`（第 226 行）

- 类型：箭头函数
- 签名：`validateStatus()`
- 功能：检查 status 是否满足约束。
- 行为提示：未识别到显著的外部副作用。

### `toolCodeSearch`（第 244 行）

- 类型：函数
- 签名：`export function toolCodeSearch(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool code search 涉及的数据转换为目标结构。
- 行为提示：访问文件系统。

### `walk`（第 264 行）

- 类型：函数
- 签名：`function walk(dir: string)`
- 功能：实现 walk 相关的业务逻辑。
- 行为提示：访问文件系统。

### `toolGitOperation`（第 316 行）

- 类型：函数
- 签名：`export function toolGitOperation(params: Record<string, any>, workspacePath: string): ToolExecutionResult`
- 功能：将 tool git operation 涉及的数据转换为目标结构。
- 行为提示：访问 HTTP/API。
- 本次改动：安全命令白名单扩充 `ls-files` / `ls-tree` / `describe` / `blame` / `grep` / `rev-list` / `cat-file` 等只读查询命令，使 Agent 可用 git 定位/枚举工作空间文件。

### `resolveToolProjectId`（第 360 行）

- 类型：函数
- 签名：`export function resolveToolProjectId(params: Record<string, any>, context: ToolExecutionContext): string | undefined`
- 功能：实现 resolve tool project id 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `toolGetProjectMembers`（第 374 行）

- 类型：函数
- 签名：`export function toolGetProjectMembers(params: Record<string, any>, context: ToolExecutionContext): ToolExecutionResult`
- 功能：将 tool get project members 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `toolCreateTicket`（第 389 行）

- 类型：函数
- 签名：`export async function toolCreateTicket(params: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>`
- 功能：将 tool create ticket 涉及的数据转换为目标结构。
- 行为提示：包含异步操作。

### `executeToolImplementation`（第 428 行）

- 类型：函数
- 签名：`export async function executeToolImplementation( toolName: string, params: Record<string, any>, workspacePath: string, context: ToolExecutionContext =`
- 功能：执行 tool implementation 工作流并返回处理结果。
- 行为提示：包含异步操作。
- 本次改动：分发映射新增 `list_files`、`file_exists` 两个工具。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
