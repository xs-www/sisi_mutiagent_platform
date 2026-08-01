# agent.ts

- 源文件：`apps/frontend/src/api/agent.ts`
- 文件职责：前端 API 适配层：封装后端接口请求及其参数类型。
- 具名函数/方法：9 个

## 函数与方法

### `getAgents`（第 21 行）

- 类型：函数
- 签名：`export async function getAgents(): Promise<Agent[]>`
- 功能：读取或查询 agents 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `getAgent`（第 26 行）

- 类型：函数
- 签名：`export async function getAgent(id: string): Promise<Agent>`
- 功能：读取或查询 agent 数据并返回结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `deleteAgent`（第 31 行）

- 类型：函数
- 签名：`export async function deleteAgent(id: string): Promise<void>`
- 功能：删除或清理 agent 相关资源。
- 行为提示：包含异步操作；访问 HTTP/API。

### `updateAgent`（第 35 行）

- 类型：函数
- 签名：`export async function updateAgent(id: string, updates: Partial<`
- 功能：更新并保存 agent 状态或数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `createAgent`（第 55 行）

- 类型：函数
- 签名：`export async function createAgent(body:`
- 功能：创建或注册 agent 数据。
- 行为提示：包含异步操作；访问 HTTP/API。

### `executeAgent`（第 75 行）

- 类型：函数
- 签名：`export async function executeAgent( agentId: string, body:`
- 功能：执行 agent 工作流并返回处理结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `executeAgentStream`（第 94 行）

- 类型：函数
- 签名：`export async function executeAgentStream( agentId: string, body:`
- 功能：SSE 流式执行 Agent：用 fetch + ReadableStream 消费 text/event-stream， 逐条事件回调 onEvent 实时更新 UI。流结束后 onComplete 给出汇总结果。
- 行为提示：包含异步操作；访问 HTTP/API。

### `dispatchFrame`（第 129 行）

- 类型：箭头函数
- 签名：`dispatchFrame(frame: string): void`
- 功能：执行 frame 工作流并返回处理结果。
- 行为提示：未识别到显著的外部副作用。

### `generateAgent`（第 182 行）

- 类型：函数
- 签名：`export async function generateAgent(body:`
- 功能：构建或格式化 agent。
- 行为提示：包含异步操作；访问 HTTP/API。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
