# executor.ts

- 源文件：`apps/backend/src/modules/tools/executor.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：4 个

## 函数与方法

### `executeTool`（第 8 行）

- 类型：函数
- 签名：`export async function executeTool( toolName: string, params: Record<string, any>, agentConfig: AgentConfig, ticketId: string, workspacePath: string, context?: Partial<ToolExecutionContext>, reason?: string ): Promise<ToolResult>`
- 功能：执行 tool 工作流并返回处理结果。
- 行为提示：包含异步操作。

### `executeApprovedTool`（第 71 行）

- 类型：函数
- 签名：`export async function executeApprovedTool( approvalId: string, workspacePath: string, agentConfig: AgentConfig, context?: Partial<ToolExecutionContext> ): Promise<ToolExecutionResult>`
- 功能：执行 approved tool 工作流并返回处理结果。
- 行为提示：包含异步操作。

### `rejectApproval`（第 94 行）

- 类型：函数
- 签名：`export function rejectApproval(approvalId: string, userResponse?: string): boolean`
- 功能：实现 reject approval 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `approveApproval`（第 98 行）

- 类型：函数
- 签名：`export function approveApproval(approvalId: string, userResponse?: string): boolean`
- 功能：实现 approve approval 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
