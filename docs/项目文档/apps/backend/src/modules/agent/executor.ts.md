# executor.ts

- 源文件：`apps/backend/src/modules/agent/executor.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：5 个

## 函数与方法

### `executeAgent`（第 38 行）

- 类型：函数
- 签名：`export async function executeAgent( agent: Agent, ticketId: string, projectId?: string, options?: ExecutionOptions ): Promise<ExecutionResult>`
- 功能：执行 agent 工作流并返回处理结果。
- 行为提示：包含异步操作；发布事件；可能抛出异常。

### `emit`（第 52 行）

- 类型：箭头函数
- 签名：`emit(event: AgentEvent): void`
- 功能：管理或触发 emit 通知。
- 行为提示：未识别到显著的外部副作用。

### `now`（第 65 行）

- 类型：箭头函数
- 签名：`now()`
- 功能：实现 now 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `executeAction`（第 254 行）

- 类型：函数
- 签名：`async function executeAction( action: ParsedAction, agent: Agent, ticketId: string, projectId?: string, emit?: (event: AgentEvent) => void, signal?: ExecutionSignal ): Promise<string>`
- 功能：执行 action 工作流并返回处理结果。
- 行为提示：包含异步操作；访问文件系统。

### `now`（第 262 行）

- 类型：箭头函数
- 签名：`now()`
- 功能：实现 now 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
