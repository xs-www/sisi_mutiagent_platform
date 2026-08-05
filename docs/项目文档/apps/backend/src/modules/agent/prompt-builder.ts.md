# prompt-builder.ts

- 源文件：`apps/backend/src/modules/agent/prompt-builder.ts`
- 文件职责：构建 ReAct 提示词：组装系统提示（角色/性格/可用工具/行动类型/输出格式/记忆/工作空间约束/项目成员）、工单信息与对话/ReAct 历史，输出给 LLM 的 ChatMessage 列表。
- 具名函数/方法：1 个

## 常量

### `TOOL_DESCRIPTIONS`（第 9 行）
- 类型：`Record<string, string>`
- 功能：平台基础工具描述，仅将 Agent 已授权（tools.yaml predefined）的工具注入提示词。
- 本次改动：新增 `list_files`、`file_exists` 两个工具描述。

## 函数与方法

### `buildReActPrompt`（第 27 行）

- 类型：函数
- 签名：`export function buildReActPrompt( agentConfig: AgentConfig, ticket: Ticket, messages: Message[], reactHistory: ReActStep[], projectId?: string, projectFolderDigest?: string ): ChatMessage[]`
- 功能：构建或格式化 re act prompt。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
