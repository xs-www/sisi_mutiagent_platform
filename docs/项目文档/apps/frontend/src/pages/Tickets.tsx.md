# Tickets.tsx

- 源文件：`apps/frontend/src/pages/Tickets.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：9 个

## 函数与方法

### `Tickets`（第 57 行）

- 类型：React 组件
- 签名：`export default function Tickets()`
- 功能：渲染 Tickets 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；访问 HTTP/API；更新界面或运行时状态。

### `loadProjects`（第 79 行）

- 类型：函数
- 签名：`async function loadProjects()`
- 功能：读取或查询 projects 数据并返回结果。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `loadAgents`（第 92 行）

- 类型：函数
- 签名：`async function loadAgents()`
- 功能：读取或查询 agents 数据并返回结果。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `loadTickets`（第 101 行）

- 类型：函数
- 签名：`async function loadTickets(projectId: string)`
- 功能：读取或查询 tickets 数据并返回结果。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleProjectChange`（第 127 行）

- 类型：函数
- 签名：`function handleProjectChange(value: string | undefined)`
- 功能：处理 project change 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleCardClick`（第 131 行）

- 类型：函数
- 签名：`function handleCardClick(ticketId: string)`
- 功能：处理 card click 事件并更新相关状态。
- 行为提示：未识别到显著的外部副作用。

### `handleAdvance`（第 135 行）

- 类型：函数
- 签名：`async function handleAdvance(ticket: Ticket)`
- 功能：处理 advance 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleReturn`（第 153 行）

- 类型：函数
- 签名：`async function handleReturn(ticket: Ticket)`
- 功能：处理 return 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleCreateTicket`（第 169 行）

- 类型：函数
- 签名：`async function handleCreateTicket()`
- 功能：处理 create ticket 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
