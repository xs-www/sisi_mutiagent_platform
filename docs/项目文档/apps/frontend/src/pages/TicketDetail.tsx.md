# TicketDetail.tsx

- 源文件：`apps/frontend/src/pages/TicketDetail.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：11 个

## 函数与方法

### `TicketDetail`（第 60 行）

- 类型：React 组件
- 签名：`export default function TicketDetail()`
- 功能：渲染 TicketDetail 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；访问 HTTP/API；更新界面或运行时状态。

### `handleSend`（第 159 行）

- 类型：箭头函数
- 签名：`async handleSend()`
- 功能：处理 send 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleExecute`（第 180 行）

- 类型：箭头函数
- 签名：`async handleExecute()`
- 功能：处理 execute 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `onEvent`（第 194 行）

- 类型：箭头函数
- 签名：`onEvent(event: AgentEvent)`
- 功能：处理 event 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `onComplete`（第 337 行）

- 类型：箭头函数
- 签名：`onComplete(result)`
- 功能：处理 complete 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `onError`（第 349 行）

- 类型：箭头函数
- 签名：`onError(err)`
- 功能：处理 error 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleStopExecute`（第 367 行）

- 类型：箭头函数
- 签名：`handleStopExecute()`
- 功能：处理 stop execute 事件并更新相关状态。
- 行为提示：未识别到显著的外部副作用。

### `handleStatusChange`（第 371 行）

- 类型：箭头函数
- 签名：`async handleStatusChange(next: TicketStatus)`
- 功能：处理 status change 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `toggleThought`（第 387 行）

- 类型：箭头函数
- 签名：`toggleThought(msgId: string)`
- 功能：将 toggle thought 涉及的数据转换为目标结构。
- 行为提示：访问 HTTP/API；更新界面或运行时状态。

### `renderStatusButtons`（第 399 行）

- 类型：箭头函数
- 签名：`renderStatusButtons()`
- 功能：构建或格式化 status buttons。
- 行为提示：未识别到显著的外部副作用。

### `renderMessage`（第 480 行）

- 类型：箭头函数
- 签名：`renderMessage(msg: Message)`
- 功能：构建或格式化 message。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
