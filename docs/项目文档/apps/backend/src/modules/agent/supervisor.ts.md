# supervisor.ts

- 源文件：`apps/backend/src/modules/agent/supervisor.ts`
- 文件职责：ReAct 监督模块。在每轮 Thought/Action/Observation 之后执行确定性规则诊断，决定 Agent 执行是否应 continue / retry / review / terminate。目前基于确定性规则（非 LLM），后续可扩展为 LLM 监督。
- 具名函数/方法/接口：18 个

## 类型定义

### `SupervisionDecision`（第 10 行）
- 类型：类型别名
- 取值：`'continue' | 'retry' | 'review' | 'terminate'`

### `ChildExecutionSummary`（第 12 行）
- 类型：接口
- 字段：`ticketId`, `title`, `completed`, `error?`
- 功能：子工单执行摘要。

### `SupervisionContext`（第 19 行）
- 类型：接口
- 字段：`iteration`, `maxIterations`, `currentStep`, `stepHistory`, `agentRole`, `ticketStatus`, `parsedActionType?`, `childResults?`
- 功能：监督诊断所需的完整上下文。
- 本次改动：新增 `parsedActionType?`（本轮 Action 的解析类型），用于检测"Action 解析失败（invalid）"路径。

### `SupervisionResult`（第 29 行）
- 类型：接口
- 字段：`decision`, `observation`, `reason`, `newTicketStatus?`
- 功能：监督诊断结果。

## 核心函数

### `supervise`（第 40 行）
- 类型：函数
- 签名：`export function supervise(ctx: SupervisionContext): SupervisionResult`
- 功能：按优先级顺序执行 9 条监督规则，返回第一条命中的规则结果，全部未命中则返回默认 `continue`。
- 规则优先级：invalid 解析 → 无效 finish → 自然完成 → 循环检测 → 工具连续失败 → 子工单全失败 → 剩余迭代不足 → 子工单部分失败 → 审批等待 → 默认继续。
- 本次改动：新增最高优先级规则 `checkInvalidParse`，阻止"空 Action/解析失败被当作 finish"导致的假完成。

## 子规则函数（私有）

### `checkInvalidParse`（第 88 行）
- 类型：函数
- 签名：`function checkInvalidParse(ctx: SupervisionContext): SupervisionResult | null`
- 功能：`parsedActionType === 'invalid'` 时返回 `retry`，提示 Agent 按 Thought/Action 格式重新输出。
- 边缘条件：`parsedActionType` 未设置或非 `invalid` 时不触发。

### `isNaturalCompletion`（第 98 行）
- 类型：函数
- 签名：`function isNaturalCompletion(step: ReActStep): boolean`
- 功能：判断 Action 是否为 `finish` 或 `complete_ticket` 开头。

### `checkActionLoop`（第 103 行）
- 类型：函数
- 签名：`function checkActionLoop(ctx: SupervisionContext): SupervisionResult | null`
- 功能：检测最近 3 轮（当前 + 历史最近 2 轮）Action 是否完全相同。命中则 terminate，状态设为 `failed`。
- 边缘条件：历史不足 2 轮时不检测；action 为空字符串时不触发。

### `checkRepeatedToolFailure`（第 125 行）
- 类型：函数
- 签名：`function checkRepeatedToolFailure(ctx: SupervisionContext): SupervisionResult | null`
- 功能：检测同一工具的连续失败次数。2 次失败 → `retry`（警告）；3 次及以上 → `terminate`（状态设为 `failed`）。
- 边缘条件：observation 不含 `[工具 ` 和 `执行失败` 时不视为工具失败；action 无法解析工具名时不检测。

### `checkInvalidFinish`（第 167 行）
- 类型：函数
- 签名：`function checkInvalidFinish(ctx: SupervisionContext): SupervisionResult | null`
- 功能：检测 `finish` 动作但 thought 为空的情况 → `retry`。
- 边缘条件：action 不以 `finish` 开头时不检测。

### `checkAllChildrenFailed`（第 183 行）
- 类型：函数
- 签名：`function checkAllChildrenFailed(ctx: SupervisionContext): SupervisionResult | null`
- 功能：所有子工单均未完成且 agent 角色为 supervisor → `review`（状态设为 `reviewing`）。
- 边缘条件：无 `childResults` 时不检测；非 supervisor 角色不检测。
- 本次改动：executor 现会将子工单执行结果传入 `childResults`，此规则由"形同虚设"变为实际生效。

### `buildLowIterationWarning`（第 199 行）
- 类型：函数
- 签名：`function buildLowIterationWarning(ctx: SupervisionContext): SupervisionResult | null`
- 功能：剩余 1 或 2 次迭代时返回 `continue` + 兜底警告建议。

### `buildChildPartialFailWarning`（第 212 行）
- 类型：函数
- 签名：`function buildChildPartialFailWarning(ctx: SupervisionContext): SupervisionResult | null`
- 功能：子工单部分失败（非全部）时返回 `continue` + 风险提示。
- 边缘条件：仅 supervisor 角色触发；全部失败的情况已被 `checkAllChildrenFailed` 优先处理。

### `isApprovalWaiting`（第 229 行）
- 类型：函数
- 签名：`function isApprovalWaiting(ctx: SupervisionContext): boolean`
- 功能：检测 observation 是否包含审批等待关键词（`需要用户审批` / `审批中心`）。

### `isToolFailure`（第 234 行）
- 类型：函数
- 签名：`function isToolFailure(observation: string): boolean`
- 功能：判断 observation 字符串是否匹配工具失败格式（`[工具 XXX 执行失败]`）。

### `extractToolName`（第 239 行）
- 类型：函数
- 签名：`function extractToolName(action: string): string | null`
- 功能：从 `tool_call(TOOL_NAME, ...)` 格式中提取工具名，去除引号。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
