# orchestration.ts

- 源文件：`apps/backend/src/modules/agent/orchestration.ts`
- 文件职责：实现该源码文件对应的模块能力。
- 具名函数/方法：1 个

## 函数与方法

### `dispatchChildTicketExecution`（第 34 行）

- 类型：函数
- 签名：`export async function dispatchChildTicketExecution(input: ChildTicketDispatchInput): Promise<ChildTicketDispatchResult>`
- 功能：同步串行派发子工单执行：阻塞调用方（父工单 ReAct 循环），等子工单跑完才返回。 这样 supervisor 派出"资料查询"后会等其完成、拿到结果，再决定如何派"写文章"， 天然保证 agent 间依赖顺序，避免并行导致的依赖错乱。 子工单执行事件通过 onEvent 透传到父工单 SSE 流（带 childTicketId 标识）， 避免父工单页面在阻塞期间长时间静默。
- 行为提示：包含异步操作。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
