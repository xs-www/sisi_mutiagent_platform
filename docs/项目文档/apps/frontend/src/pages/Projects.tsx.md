# Projects.tsx

- 源文件：`apps/frontend/src/pages/Projects.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。项目列表、新建项目弹窗（项目名称必填、AI 生成项目描述并推荐 Agent、主 Agent 默认项目监理、添加 Agent 多选默认含全部内置）、项目成员管理抽屉。
- 具名函数/方法：15 个

## 函数与方法

### `Projects`（第 44 行）

- 类型：React 组件
- 签名：`export default function Projects()`
- 功能：渲染 Projects 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；访问 HTTP/API；更新界面或运行时状态。

### `loadProjects`（第 104 行）

- 类型：函数
- 签名：`async function loadProjects()`
- 功能：读取或查询 projects 数据并返回结果。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `loadAgents`（第 117 行）

- 类型：函数
- 签名：`async function loadAgents()`
- 功能：读取或查询 agents 数据并返回结果。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleCreateProject`（第 131 行）

- 类型：函数
- 签名：`async function handleCreateProject()`
- 功能：创建项目：先调用 `createProject`，随后将表单"添加 Agent"中选中的自定义 Agent 及主 Agent（内置 Agent 由后端自动加入）逐一遍历 `addProjectMember` 加入成员。
- 行为提示：包含异步操作；访问 HTTP/API；更新界面或运行时状态。

### `handleAiGenerate`（第 162 行）

- 类型：函数
- 签名：`async function handleAiGenerate()`
- 功能：点击"AI 生成"：校验项目名称后调用 `generateProjectAi`（传入项目名称与全部 Agent 概要），用返回的描述回填"项目描述"，并将返回的 `recommendedAgentIds` 与"添加 Agent"当前选中值合并（去重）。
- 行为提示：包含异步操作；访问 HTTP/API；更新界面或运行时状态。

### `handleEnterTickets`（第 194 行）

- 类型：函数
- 签名：`function handleEnterTickets(project: Project)`
- 功能：处理 enter tickets 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleDeleteProject`（第 199 行）

- 类型：函数
- 签名：`async function handleDeleteProject(project: Project)`
- 功能：处理 delete project 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `openMemberDrawer`（第 214 行）

- 类型：函数
- 签名：`async function openMemberDrawer(project: Project)`
- 功能：实现 open member drawer 相关的业务逻辑。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `loadMembers`（第 222 行）

- 类型：函数
- 签名：`async function loadMembers(projectId: string)`
- 功能：读取或查询 members 数据并返回结果。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleAddMember`（第 235 行）

- 类型：函数
- 签名：`async function handleAddMember()`
- 功能：处理 add member 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleRemoveMember`（第 254 行）

- 类型：函数
- 签名：`async function handleRemoveMember(agentId: string)`
- 功能：处理 remove member 事件并更新相关状态。
- 行为提示：包含异步操作。

### `closeDrawer`（第 266 行）

- 类型：函数
- 签名：`function closeDrawer()`
- 功能：删除或清理 drawer 相关资源。
- 行为提示：更新界面或运行时状态。

### `render`（第 277 行）

- 类型：箭头函数
- 签名：`render(_, record)`
- 功能：构建或格式化 render。
- 行为提示：访问 HTTP/API。

### `render`（第 286 行）

- 类型：箭头函数
- 签名：`render(v: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 292 行）

- 类型：箭头函数
- 签名：`render(_, record)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
