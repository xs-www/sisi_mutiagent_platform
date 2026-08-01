# repository.ts

- 源文件：`apps/backend/src/modules/approval/repository.ts`
- 文件职责：数据仓储层：封装持久化数据的查询和变更操作。
- 具名函数/方法：7 个

## 函数与方法

### `createApprovalRequest`（第 6 行）

- 类型：函数
- 签名：`export function createApprovalRequest(input: CreateApprovalInput): ApprovalRequest`
- 功能：创建或注册 approval request 数据。
- 行为提示：读写数据库。

### `getApprovalRequest`（第 19 行）

- 类型：函数
- 签名：`export function getApprovalRequest(id: string): ApprovalRequest | null`
- 功能：读取或查询 approval request 数据并返回结果。
- 行为提示：读写数据库。

### `getApprovalsByTicket`（第 26 行）

- 类型：函数
- 签名：`export function getApprovalsByTicket(ticketId: string): ApprovalRequest[]`
- 功能：读取或查询 approvals by ticket 数据并返回结果。
- 行为提示：读写数据库。

### `getPendingApprovals`（第 32 行）

- 类型：函数
- 签名：`export function getPendingApprovals(): ApprovalRequest[]`
- 功能：读取或查询 pending approvals 数据并返回结果。
- 行为提示：读写数据库。

### `getApprovalsByAgent`（第 38 行）

- 类型：函数
- 签名：`export function getApprovalsByAgent(agentId: string): ApprovalRequest[]`
- 功能：读取或查询 approvals by agent 数据并返回结果。
- 行为提示：读写数据库。

### `updateApprovalStatus`（第 44 行）

- 类型：函数
- 签名：`export function updateApprovalStatus( id: string, status: ApprovalStatus, userResponse?: string ): boolean`
- 功能：更新并保存 approval status 状态或数据。
- 行为提示：读写数据库。

### `mapRow`（第 58 行）

- 类型：函数
- 签名：`function mapRow(row: any): ApprovalRequest`
- 功能：将 map row 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
