# ProjectDetail.tsx

- 源文件：`apps/frontend/src/pages/ProjectDetail.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：16 个

## 函数与方法

### `ProjectDetail`（第 47 行）

- 类型：React 组件
- 签名：`export default function ProjectDetail()`
- 功能：渲染 ProjectDetail 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；访问 HTTP/API；更新界面或运行时状态。
- 说明：本次改动——页面新增「Token 消耗」统计卡片（调用次数、输入命中缓存、输入未命中、输出、缓存写入、合计），数据来自 `GET /api/usage/projects/:id`；`loadData` 并行加载用量（失败时降级为 null）。

### `handleEdit`（第 117 行）

- 类型：箭头函数
- 签名：`handleEdit()`
- 功能：处理 edit 事件，打开编辑项目模态框（仅 `setEditModalOpen(true)`）。
- 行为提示：更新界面或运行时状态。

### `handleEditSave`（第 122 行）

- 类型：箭头函数
- 签名：`async handleEditSave()`
- 功能：处理 edit save 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

> 说明（本次改动）：编辑项目弹窗回填方案改为「条件渲染 + `initialValues`」：
> - Modal 使用 `destroyOnHidden`（antd 5.29 中 `destroyOnClose` 已废弃）；
> - 仅当 `editModalOpen && project` 时才渲染 Form，保证每次打开时 Form 全新挂载；
> - Form 通过 `initialValues` 全量传入当前项目信息（name、description、supervisorId、status），不依赖 `setFieldsValue` 的时序，彻底避免 `destroyOnClose` + `preserve={false}` 下表单预填失效的问题。

### `handleAddMember`（第 140 行）

- 类型：箭头函数
- 签名：`async handleAddMember()`
- 功能：处理 add member 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleRemoveMember`（第 152 行）

- 类型：箭头函数
- 签名：`async handleRemoveMember(agentId: string)`
- 功能：处理 remove member 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleDeleteTicket`（第 163 行）

- 类型：箭头函数
- 签名：`async handleDeleteTicket(ticketId: string)`
- 功能：处理 delete ticket 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleOpenFolder`（第 173 行）

- 类型：箭头函数
- 签名：`async handleOpenFolder(target: 'project' | 'workspace')`
- 功能：处理 open folder 事件并更新相关状态。
- 行为提示：包含异步操作。

### `render`（第 187 行）

- 类型：箭头函数
- 签名：`render(_, record)`
- 功能：构建或格式化 render。
- 行为提示：访问 HTTP/API。

### `render`（第 203 行）

- 类型：箭头函数
- 签名：`render(v: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 209 行）

- 类型：箭头函数
- 签名：`render(_, record)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 229 行）

- 类型：箭头函数
- 签名：`render(title: string, record: Ticket)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 238 行）

- 类型：箭头函数
- 签名：`render(status: Ticket['status'])`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 247 行）

- 类型：箭头函数
- 签名：`render(p: Ticket['priority'])`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 254 行）

- 类型：箭头函数
- 签名：`render(aid: string | null)`
- 功能：构建或格式化 render。
- 行为提示：访问 HTTP/API。

### `render`（第 264 行）

- 类型：箭头函数
- 签名：`render(v: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 270 行）

- 类型：箭头函数
- 签名：`render(_, record)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
