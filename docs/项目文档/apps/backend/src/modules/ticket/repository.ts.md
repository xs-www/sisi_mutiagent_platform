# repository.ts

- 源文件：`apps/backend/src/modules/ticket/repository.ts`
- 文件职责：数据仓储层：封装持久化数据的查询和变更操作。
- 具名函数/方法：27 个

## 函数与方法

### `withTicketLock`（第 21 行）

- 类型：函数
- 签名：`function withTicketLock<T>(ticketId: string, fn: () => T | Promise<T>): Promise<T>`
- 功能：实现 with ticket lock 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `sanitizeTicketName`（第 37 行）

- 类型：函数
- 签名：`function sanitizeTicketName(title: string): string`
- 功能：实现 sanitize ticket name 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `readTicketOwnerId`（第 48 行）

- 类型：函数
- 签名：`function readTicketOwnerId(filePath: string): string | undefined`
- 功能：实现 read ticket owner id 相关的业务逻辑。
- 行为提示：访问文件系统。

### `findTicketDocumentPath`（第 57 行）

- 类型：函数
- 签名：`function findTicketDocumentPath(projectId: string, ticketId: string): string | null`
- 功能：读取或查询 ticket document path 数据并返回结果。
- 行为提示：访问文件系统。

### `resolveTicketFilePathForWrite`（第 77 行）

- 类型：函数
- 签名：`function resolveTicketFilePathForWrite(ticket: Ticket): string`
- 功能：实现 resolve ticket file path for write 相关的业务逻辑。
- 行为提示：访问文件系统。

### `writeTicketDocument`（第 110 行）

- 类型：函数
- 签名：`function writeTicketDocument(document: TicketDocument): void`
- 功能：更新并保存 ticket document 状态或数据。
- 行为提示：访问文件系统。

### `readTicketDocument`（第 115 行）

- 类型：函数
- 签名：`function readTicketDocument(projectId: string, ticketId: string): TicketDocument | null`
- 功能：实现 read ticket document 相关的业务逻辑。
- 行为提示：访问文件系统。

### `getTicketRowById`（第 128 行）

- 类型：函数
- 签名：`function getTicketRowById(ticketId: string): any | null`
- 功能：读取或查询 ticket row by id 数据并返回结果。
- 行为提示：读写数据库。

### `hydrateTicketFromRow`（第 134 行）

- 类型：函数
- 签名：`function hydrateTicketFromRow(row: any): Ticket`
- 功能：实现 hydrate ticket from row 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `upsertTicketIndexFromDocument`（第 140 行）

- 类型：函数
- 签名：`function upsertTicketIndexFromDocument(ticket: Ticket): void`
- 功能：实现 upsert ticket index from document 相关的业务逻辑。
- 行为提示：读写数据库。

### `createTicket`（第 161 行）

- 类型：函数
- 签名：`export function createTicket(input: CreateTicketInput): Ticket`
- 功能：创建或注册 ticket 数据。
- 行为提示：读写数据库。

### `getTicketById`（第 206 行）

- 类型：函数
- 签名：`export function getTicketById(id: string): Ticket | null`
- 功能：读取或查询 ticket by id 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getTicketsByProject`（第 212 行）

- 类型：函数
- 签名：`export function getTicketsByProject(projectId: string): Ticket[]`
- 功能：读取或查询 tickets by project 数据并返回结果。
- 行为提示：读写数据库。

### `getTicketsByAssignee`（第 218 行）

- 类型：函数
- 签名：`export function getTicketsByAssignee(agentId: string): Ticket[]`
- 功能：读取或查询 tickets by assignee 数据并返回结果。
- 行为提示：读写数据库。

### `getTicketsByParent`（第 224 行）

- 类型：函数
- 签名：`export function getTicketsByParent(parentId: string): Ticket[]`
- 功能：读取或查询 tickets by parent 数据并返回结果。
- 行为提示：读写数据库。

### `updateTicketStatusUnsafe`（第 230 行）

- 类型：函数
- 签名：`function updateTicketStatusUnsafe(id: string, status: TicketStatusUpdate): Ticket | null`
- 功能：更新并保存 ticket status unsafe 状态或数据。
- 行为提示：未识别到显著的外部副作用。

### `updateTicketStatus`（第 251 行）

- 类型：函数
- 签名：`export function updateTicketStatus(id: string, status: TicketStatusUpdate): Promise<Ticket | null>`
- 功能：更新并保存 ticket status 状态或数据。
- 行为提示：未识别到显著的外部副作用。

### `assignTicketUnsafe`（第 255 行）

- 类型：函数
- 签名：`function assignTicketUnsafe(id: string, agentId: string): Ticket | null`
- 功能：实现 assign ticket unsafe 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `assignTicket`（第 275 行）

- 类型：函数
- 签名：`export function assignTicket(id: string, agentId: string): Promise<Ticket | null>`
- 功能：实现 assign ticket 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `deleteTicket`（第 279 行）

- 类型：函数
- 签名：`export function deleteTicket(id: string): boolean`
- 功能：删除或清理 ticket 相关资源。
- 行为提示：读写数据库。

### `createMessageUnsafe`（第 295 行）

- 类型：函数
- 签名：`function createMessageUnsafe(input: CreateMessageInput): Message`
- 功能：创建或注册 message unsafe 数据。
- 行为提示：读写数据库；可能抛出异常。

### `createMessage`（第 330 行）

- 类型：函数
- 签名：`export function createMessage(input: CreateMessageInput): Promise<Message>`
- 功能：创建或注册 message 数据。
- 行为提示：未识别到显著的外部副作用。

### `getMessageById`（第 334 行）

- 类型：函数
- 签名：`export function getMessageById(id: string): Message | null`
- 功能：读取或查询 message by id 数据并返回结果。
- 行为提示：读写数据库。

### `getMessagesByTicket`（第 347 行）

- 类型：函数
- 签名：`export function getMessagesByTicket(ticketId: string): Message[]`
- 功能：读取或查询 messages by ticket 数据并返回结果。
- 行为提示：读写数据库。

### `migrateTicketPayloadsToProjectFiles`（第 361 行）

- 类型：函数
- 签名：`export function migrateTicketPayloadsToProjectFiles(): void`
- 功能：实现 migrate ticket payloads to project files 相关的业务逻辑。
- 行为提示：读写数据库。

### `mapRowToTicket`（第 385 行）

- 类型：函数
- 签名：`function mapRowToTicket(row: any): Ticket`
- 功能：将 map row to ticket 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `mapRowToMessage`（第 403 行）

- 类型：函数
- 签名：`function mapRowToMessage(row: any): Message`
- 功能：将 map row to message 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
