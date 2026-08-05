# executor.ts

- 源文件：`apps/backend/src/modules/agent/executor.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：5 个

## 函数与方法

### `executeAgent`（第 39 行）

- 类型：函数
- 签名：`export async function executeAgent( agent: Agent, ticketId: string, projectId?: string, options?: ExecutionOptions ): Promise<ExecutionResult>`
- 功能：执行 agent 工作流并返回处理结果。
- 行为提示：包含异步操作；发布事件；可能抛出异常。
- 说明：本次改动——① 新增 `childResults` 数组收集子工单执行结果，并在调用 `supervise()` 时传入 `parsedActionType` 与 `childResults`，使监督层的 invalid 解析与子工单失败规则实际生效；② ReAct 循环中调用 `chatWithPlatformModels` 时新增第三个参数，携带 `{ projectId: effectiveProjectId, ticketId, agentId: agent.id }`，供 LLM 层将每次调用的 token 用量归属到对应项目/工单/Agent。

### `emit`（第 56 行）

- 类型：箭头函数
- 签名：`emit(event: AgentEvent): void`
- 功能：管理或触发 emit 通知。
- 行为提示：未识别到显著的外部副作用。

### `now`（第 69 行）

- 类型：箭头函数
- 签名：`now()`
- 功能：实现 now 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `executeAction`（第 331 行）

- 类型：函数
- 签名：`async function executeAction( action: ParsedAction, agent: Agent, ticketId: string, projectId?: string, emit?: (event: AgentEvent) => void, signal?: ExecutionSignal, childResults?: ChildExecutionSummary[] ): Promise<string>`
- 功能：执行 action 工作流并返回处理结果。
- 行为提示：包含异步操作；访问文件系统。
- 本次改动：新增 `childResults` 参数（子工单结果收集数组）；`create_ticket` 分支将 `dispatchChildTicketExecution` 返回的 `completed`/`error` 记入 `childResults`；新增 `invalid` 分支，返回"Action 无法解析"提示而非静默结束。

### `now`（第 340 行）

- 类型：箭头函数
- 签名：`now()`
- 功能：实现 now 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
