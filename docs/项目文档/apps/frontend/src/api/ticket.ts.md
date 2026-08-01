# ticket.ts

- 源文件：`apps/frontend/src/api/ticket.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：9 个

## 函数与方法

### `getTicketsByProject`（第 4 行）

- 类型：函数
- 签名：`export async function getTicketsByProject(projectId: string): Promise<Ticket[]>`
- 功能：读取或查询 tickets by project 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getTicket`（第 9 行）

- 类型：函数
- 签名：`export async function getTicket(id: string): Promise<Ticket>`
- 功能：读取或查询 ticket 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getChildTickets`（第 14 行）

- 类型：函数
- 签名：`export async function getChildTickets(parentId: string): Promise<Ticket[]>`
- 功能：读取或查询 child tickets 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `createTicket`（第 19 行）

- 类型：函数
- 签名：`export async function createTicket(body:`
- 功能：创建或注册 ticket 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `updateTicketStatus`（第 33 行）

- 类型：函数
- 签名：`export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket>`
- 功能：更新并保存 ticket status 状态或数据。
- 行为提示：包含异步操作。

### `assignTicket`（第 38 行）

- 类型：函数
- 签名：`export async function assignTicket(id: string, agentId: string): Promise<Ticket>`
- 功能：实现 assign ticket 相关的业务逻辑。
- 行为提示：包含异步操作。

### `getMessages`（第 43 行）

- 类型：函数
- 签名：`export async function getMessages(ticketId: string): Promise<Message[]>`
- 功能：读取或查询 messages 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `sendMessage`（第 48 行）

- 类型：函数
- 签名：`export async function sendMessage(ticketId: string, body:`
- 功能：执行 message 工作流并返回处理结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `deleteTicket`（第 58 行）

- 类型：函数
- 签名：`export async function deleteTicket(id: string): Promise<void>`
- 功能：删除或清理 ticket 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
