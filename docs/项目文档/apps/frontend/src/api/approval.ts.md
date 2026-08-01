# approval.ts

- 源文件：`apps/frontend/src/api/approval.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：6 个

## 函数与方法

### `getPendingApprovals`（第 4 行）

- 类型：函数
- 签名：`export async function getPendingApprovals(): Promise<ApprovalRequest[]>`
- 功能：读取或查询 pending approvals 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getApproval`（第 9 行）

- 类型：函数
- 签名：`export async function getApproval(id: string): Promise<ApprovalRequest>`
- 功能：读取或查询 approval 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `approveApproval`（第 14 行）

- 类型：函数
- 签名：`export async function approveApproval(id: string, userResponse?: string): Promise<void>`
- 功能：实现 approve approval 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `rejectApproval`（第 18 行）

- 类型：函数
- 签名：`export async function rejectApproval(id: string, userResponse?: string): Promise<void>`
- 功能：实现 reject approval 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getApprovalsByTicket`（第 22 行）

- 类型：函数
- 签名：`export async function getApprovalsByTicket(ticketId: string): Promise<ApprovalRequest[]>`
- 功能：读取或查询 approvals by ticket 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getApprovalsByAgent`（第 27 行）

- 类型：函数
- 签名：`export async function getApprovalsByAgent(agentId: string): Promise<ApprovalRequest[]>`
- 功能：读取或查询 approvals by agent 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
