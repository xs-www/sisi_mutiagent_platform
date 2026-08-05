# project.ts

- 源文件：`apps/frontend/src/api/project.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型，含项目 CRUD、成员管理、打开项目目录，以及 AI 生成项目描述与推荐 Agent（`generateProjectAi`）。
- 具名函数/方法：10 个

## 函数与方法

### `getProjects`（第 4 行）

- 类型：函数
- 签名：`export async function getProjects(): Promise<Project[]>`
- 功能：读取或查询 projects 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getProject`（第 9 行）

- 类型：函数
- 签名：`export async function getProject(id: string): Promise<Project>`
- 功能：读取或查询 project 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `createProject`（第 14 行）

- 类型：函数
- 签名：`export async function createProject(body:`
- 功能：创建或注册 project 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `generateProjectAi`（第 29 行）

- 类型：函数
- 签名：`export async function generateProjectAi(body: { name: string; agents: Array<{ id: string; name: string; role?: string; description?: string }> }): Promise<ProjectAiSuggestion>`
- 功能：调用 `POST /api/projects/generate-ai`，让 AI 根据项目名称生成项目描述（`description`）并返回推荐的 Agent ID 列表（`recommendedAgentIds`）。
- 行为提示：包含异步操作；访问 HTTP/API；出参类型为 `ProjectAiSuggestion`（第 23 行定义）。

### `updateProject`（第 37 行）

- 类型：函数
- 签名：`export async function updateProject(id: string, body: Partial<Project>): Promise<Project>`
- 功能：更新并保存 project 状态或数据。
- 行为提示：包含异步操作。

### `deleteProject`（第 42 行）

- 类型：函数
- 签名：`export async function deleteProject(id: string): Promise<void>`
- 功能：删除或清理 project 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

### `openProjectFolder`（第 47 行）

- 类型：函数
- 签名：`export async function openProjectFolder(projectId: string, target: 'project' | 'workspace'): Promise<void>`
- 功能：实现 open project folder 相关的业务逻辑。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getProjectMembers`（第 51 行）

- 类型：函数
- 签名：`export async function getProjectMembers(projectId: string): Promise<ProjectMember[]>`
- 功能：读取或查询 project members 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `addProjectMember`（第 56 行）

- 类型：函数
- 签名：`export async function addProjectMember(projectId: string, agentId: string): Promise<ProjectMember>`
- 功能：创建或注册 project member 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `removeProjectMember`（第 61 行）

- 类型：函数
- 签名：`export async function removeProjectMember(projectId: string, agentId: string): Promise<void>`
- 功能：删除或清理 project member 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
