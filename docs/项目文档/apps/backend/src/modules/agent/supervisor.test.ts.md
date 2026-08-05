# supervisor.test.ts

- 源文件：`apps/backend/src/modules/agent/supervisor.test.ts`
- 文件职责：`supervisor.ts` 的单元测试文件。使用 vitest 覆盖监督规则的各类场景：自然完成、循环检测、工具连续失败、无效 finish、Action 解析失败（invalid）、迭代不足警告、子工单失败、审批等待、正常工具调用。
- 具名函数/测试用例：16 个

## 辅助函数

### `makeStep`（第 5 行）
- 类型：函数
- 签名：`function makeStep(thought: string, action: string, observation: string): ReActStep`
- 功能：构造测试用的 `ReActStep` 对象。

### `makeCtx`（第 9 行）
- 类型：函数
- 签名：`function makeCtx(overrides?: Partial<SupervisionContext>): SupervisionContext`
- 功能：构造默认 `SupervisionContext`，支持部分覆盖。

## 测试用例（describe('supervise', ...)）

| 测试分组 | 测试用例 | 预期 |
| --- | --- | --- |
| 正常完成不干预 | 自然 finish 返回 continue | `decision='continue'` |
| | 自然 complete_ticket 返回 continue | `decision='continue'` |
| 循环检测 | 连续 3 轮相同 Action → terminate | `decision='terminate'`, `newTicketStatus='failed'` |
| | 不足 3 轮不触发 | `decision='continue'` |
| 工具连续失败 | 同一工具连续失败 2 次 → retry | `decision='retry'`, observation 含工具名 |
| | 同一工具连续失败 3 次 → terminate | `decision='terminate'`, `newTicketStatus='failed'` |
| 无效 finish | finish 但 thought 为空 → retry | `decision='retry'` |
| | finish 有 thought → continue | `decision='continue'` |
| Action 解析失败（invalid） | 解析类型 invalid → retry（禁止当作完成） | `decision='retry'`, observation 含 `无法解析` |
| | 未标记 parsedActionType 时不误伤正常调用 | `decision='continue'` |
| 剩余迭代不足 | 剩余 2 次 → 兜底建议 | `decision='continue'`, observation 含 `剩余迭代次数` |
| | 剩余 1 次 → 兜底建议 | observation 含 `剩余迭代次数` 和 `1` |
| 子工单失败 | 所有子工单失败 (supervisor) → review | `decision='review'`, `newTicketStatus='reviewing'` |
| | 部分子工单失败 (supervisor) → continue + 警告 | `decision='continue'`, observation 含 `1 个子工单未完成` |
| 审批等待 | 工具等待审批 → 不干预 | `decision='continue'`, observation 为空 |
| 正常调用 | 正常工具调用成功 → 不干预 | `decision='continue'`, observation 为空 |

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
