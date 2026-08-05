# action-parser.ts

- 源文件：`apps/backend/src/modules/agent/action-parser.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：3 个

## 类型定义

### `ActionType`（第 3 行）
- 类型：类型别名
- 取值：`'tool_call' | 'message' | 'create_ticket' | 'complete_ticket' | 'finish' | 'invalid'`
- 功能：行动类型枚举。
- 本次改动：新增 `'invalid'` 类型。此前无法解析的 Action 被默认当作 `finish`，导致"空操作=任务完成"的假完成；现在返回 `invalid` 由监督层 retry。

## 函数与方法

### `parseAgentResponse`（第 25 行）

- 类型：函数
- 签名：`export function parseAgentResponse(response: string): ParsedAction`
- 功能：解析 agent response，转换为内部可用结构。
- 行为提示：未识别到显著的外部副作用。

### `parseAction`（第 71 行）

- 类型：函数
- 签名：`function parseAction(actionStr: string): Omit<ParsedAction, 'thought' | 'raw'>`
- 功能：解析 action，转换为内部可用结构。
- 行为提示：未识别到显著的外部副作用。
- 本次改动：空工具名的 `tool_call` 与无法匹配任何格式的 Action 均返回 `{ type: 'invalid' }`（原为 `{ type: 'finish' }`）。

### `parseSimpleParams`（第 133 行）

- 类型：函数
- 签名：`function parseSimpleParams(str: string): Record<string, any>`
- 功能：解析 simple params，转换为内部可用结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
