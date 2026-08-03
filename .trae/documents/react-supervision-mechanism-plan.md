# ReAct 监督机制 实施计划

## Summary（概述）

当前 Agent 执行循环仅靠 `maxIterations=10` 硬截断，缺少中途监督。本计划在每轮 Thought/Action/Observation 之后引入**监督层**，自动诊断执行质量并决定 continue/retry/review/terminate。同时支持父工单对子工单执行结果的风险汇总。

## Current State Analysis（现状分析）

### 已有基础设施（无需重建）
- **执行引擎**：`executor.ts` 已有完整的 ReAct 循环（Thought→Action→Observation），支持 SSE 事件流（`onEvent` 回调）、取消信号（`AbortController`）、子工单同步串行编排
- **事件系统**：`events.ts` 已定义 `AgentEvent` 联合类型，支持 start/iteration_start/thought/action/observation/ticket_status/child_dispatched/complete/error
- **状态机**：`TicketStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed' | 'failed' | 'blocked'`，`executor.ts` 在失败时自动置 `failed`
- **工单仓库**：`repository.ts` 已有 `withTicketLock` 写入互斥锁、`createMessage`/`updateTicketStatus` 等操作
- **前端**：`TicketDetail.tsx` 已支持 SSE 流式渲染、状态按钮（failed→重置/重试，blocked→解除阻塞）、子工单折叠列表

### 当前缺失的核心能力
1. **无中途监督**：仅 `maxIterations` 硬截断，LLM 陷入循环/反复失败时无法自动终止
2. **无诊断能力**：无效 Action、工具失败、循环派单等只记录日志，不生成可操作的 Observation
3. **无自动状态流转**：监督结果无法驱动状态机（如自动进入 reviewing/failed/blocked）
4. **父工单无风险汇总**：子工单失败后父工单仅收到"执行未完成"消息，无结构化风险评估

## Proposed Changes（变更详情）

### 1. 新建 `apps/backend/src/modules/agent/supervisor.ts` — 监督模块

**What**：实现 ReAct 监督逻辑，在每轮迭代后自动诊断执行质量。

**Why**：将监督逻辑从 executor 中解耦，便于独立测试和后续扩展（如接入 LLM 监督）。

**How**：

```typescript
// 监督决策类型
type SupervisionDecision = 'continue' | 'retry' | 'review' | 'terminate';

// 监督上下文（由 executor 传入）
interface SupervisionContext {
  iteration: number;           // 当前是第几轮
  maxIterations: number;       // 最大迭代数
  currentStep: ReActStep;      // 本轮 Thought/Action/Observation
  stepHistory: ReActStep[];    // 历史步骤
  agentRole: AgentRole;        // supervisor / specialist
  ticketStatus: TicketStatus;  // 当前工单状态
  childResults?: {             // 子工单执行结果（父工单场景）
    ticketId: string;
    title: string;
    completed: boolean;
    error?: string;
  }[];
}

interface SupervisionResult {
  decision: SupervisionDecision;
  observation: string;         // 供给 Agent 的 Observation
  reason: string;              // 决策原因（用于日志/消息）
  newTicketStatus?: TicketStatus; // 若需变更状态
}
```

**监督规则（确定性规则，非 LLM）**：

| 检测条件 | 决策 | 新状态 | Observation |
|---------|------|--------|-------------|
| 收到 `finish` Action | `continue` (自然结束) | — | — |
| 收到 `complete_ticket` Action | `continue` (自然结束) | — | — |
| 连续 2 轮同一工具失败（相同 toolName + 相同错误） | `retry` → 第 3 次 `terminate` | `failed` | "工具 X 连续失败 3 次，可能参数或环境配置有误。" |
| 连续 3 轮相同 Action（内容完全一致） | `terminate` | `failed` | "检测到重复操作，Agent 可能陷入循环。" |
| 当前 Action 是 `finish` 但参数无效（如空 thought） | `retry` | — | "请提供更详细的完成总结后再结束。" |
| 剩余迭代 ≤ 2 且未完成 | — | — | 追加兜底建议："剩余迭代次数有限，请优先完成关键任务。" |
| 子工单全部失败（父工单场景） | `review` | `reviewing` | "所有子工单均已失败，建议人工审核。" |
| 子工单部分失败（父工单场景） | — | — | 追加风险提示："N 个子工单未完成，请评估风险。" |
| 工具执行返回"需要审批" | `continue` | — | —（Agent 自行决策等待或继续） |

**核心函数签名**：

```typescript
export function supervise(context: SupervisionContext): SupervisionResult;
```

### 2. 修改 `apps/backend/src/modules/agent/events.ts` — 新增 supervision 事件

**What**：在 `AgentEventType` 中新增 `'supervision'` 类型，定义 `SupervisionEvent` 接口。

**Why**：使监督结果可通过现有 SSE 通道实时推送到前端，保持架构一致性。

**How**：

```typescript
// AgentEventType 新增:
| 'supervision'

// 新增事件接口:
interface SupervisionEvent extends AgentEventBase {
  type: 'supervision';
  iteration: number;
  decision: SupervisionDecision;
  reason: string;
  suggestion: string; // 兜底建议
}

// AgentEvent 联合类型新增:
| SupervisionEvent
```

### 3. 修改 `apps/backend/src/modules/agent/executor.ts` — 集成监督

**What**：在 ReAct 循环的每轮 Thought/Action/Observation 之后插入监督调用。

**Why**：将监督作为执行循环的标准环节，不改变现有事件流。

**How**（修改点）：

1. **第 191 行后**（`steps.push` 之后，`检查是否完成` 之前）插入监督调用：

```typescript
// ==== 监督层 ====
const supervisionResult = supervise({
  iteration: i + 1,
  maxIterations: maxIter,
  currentStep: { thought: parsed.thought, action: actionRaw.replace('Action: ', ''), observation },
  stepHistory: steps,
  agentRole: agent.role,
  ticketStatus: ticket.status,
});

if (supervisionResult.observation) {
  const supMsg = await createMessage({
    ticketId,
    senderType: 'system',
    senderId: 'system',
    content: `[监督] ${supervisionResult.observation}`,
    messageType: 'observation',
  });
  emit({
    type: 'supervision',
    iteration: i + 1,
    decision: supervisionResult.decision,
    reason: supervisionResult.reason,
    suggestion: supervisionResult.observation,
    messageId: supMsg.id,
    createdAt: supMsg.createdAt,
    timestamp: now(),
  } as any); // 类型待 events.ts 更新后对齐
}

switch (supervisionResult.decision) {
  case 'retry':
    steps.pop(); // 回退本轮步骤（下一轮重新执行）
    continue;    // 不增加迭代计数（但 for 循环 i 仍会增加，实际相当于重试）
  case 'review':
    await updateTicketStatus(ticketId, 'reviewing');
    emit({ type: 'ticket_status', status: 'reviewing', timestamp: now() });
    completed = false;
    break;       // 退出循环
  case 'terminate':
    error = supervisionResult.reason;
    failed = true;
    if (supervisionResult.newTicketStatus) {
      await updateTicketStatus(ticketId, supervisionResult.newTicketStatus);
      emit({ type: 'ticket_status', status: supervisionResult.newTicketStatus!, timestamp: now() });
    }
    break;        // 退出循环
  case 'continue':
  default:
    // 正常继续
    break;
}
```

2. **retry 决策的特殊处理**：`retry` 场景下需要让当前迭代不计入有效步骤。在 supervision 调用处，如果是 retry，pop 掉刚 push 的 steps 元素，并设一个局部计数器，但更简洁的做法是：

```typescript
// retry 时：撤销本轮步骤、不计入有效迭代、重新构建同样的 prompt（但提示 Agent 上次操作无效）
if (supervisionResult.decision === 'retry') {
  steps.pop();
  // 重新构造 Observation 为监督建议
  const retryObs = supervisionResult.observation;
  // 在下一轮开始时 Agent 会看到上次的 failure Observation + 新的监督 Observation
  continue; // 进入下一轮，重新读取 messages（包括监督消息）
}
```

> **注意**：`retry` 后 `for` 循环的 `i` 会自增，意味着 retry 会消耗一次迭代配额。这是有意设计的——无限 retry 会在 `maxIterations` 处被截断。

3. **导入 `supervise`**：
```typescript
import { supervise } from './supervisor.js';
```

### 4. 修改 `apps/backend/src/modules/agent/orchestration.ts` — 父工单子工单风险汇总

**What**：在子工单执行完成后，对父工单写入结构化的风险评估消息。

**Why**：父 Agent（supervisor）需要知道子工单的整体执行情况以便做出后续决策。

**How**（修改点）：

在 `dispatchChildTicketExecution` 的 `handleChildCompletion` 部分（第 143-162 行附近），增强回写消息内容：

```typescript
// 当前回写（第 144-162 行已有）增强为结构化风险摘要:
if (parentTicketId) {
  if (result.completed) {
    await createMessage({
      ticketId: parentTicketId,
      senderType: 'system',
      senderId: 'system',
      content: `✅ 子工单「${createdTicket.title}」已完成（${result.iterations} 轮迭代）。`,
      messageType: 'text',
    });
  } else {
    await createMessage({
      ticketId: parentTicketId,
      senderType: 'system',
      senderId: 'system',
      content: `⚠️ [风险提示] 子工单「${createdTicket.title}」执行未完成\n` +
               `- 失败原因：${result.error ?? '未知'}\n` +
               `- 已完成迭代：${result.iterations} 轮\n` +
               `- 建议：请评估是否需要重新指派或人工介入`,
      messageType: 'text',
    });
  }
}
```

### 5. 修改前端 — 监督事件渲染

**What**：在 `TicketDetail.tsx` 中渲染 `supervision` 事件。

**Why**：让用户在 UI 中看到监督决策和原因，提升透明度。

**How**：

1. **`apps/frontend/src/types/index.ts`**（或 `agent-event.ts`）新增 `SupervisionEvent` 类型：
```typescript
export interface SupervisionEvent extends AgentEventBase {
  type: 'supervision';
  iteration: number;
  decision: 'continue' | 'retry' | 'review' | 'terminate';
  reason: string;
  suggestion: string;
  messageId: string;
  createdAt: string;
}
```

2. **`apps/frontend/src/pages/TicketDetail.tsx`** 的 `onEvent` 回调中新增 `case 'supervision'`：
```typescript
case 'supervision':
  setMessages((prev) => [
    ...prev,
    {
      id: event.messageId,
      ticketId: id,
      senderType: 'system',
      senderId: 'system',
      content: `[监督·${decisionLabel(event.decision)}] ${event.suggestion}`,
      messageType: 'observation',
      createdAt: event.createdAt,
    },
  ]);
  break;
```

3. 在 `renderStatusButtons` 中，`reviewing` 状态的监督触发需要前端能展示"监督建议审核"状态——当前 reviewing 已有"审核通过/退回修改"按钮，直接复用即可。

### 6. 新建单元测试 `apps/backend/src/modules/agent/supervisor.test.ts`

**What**：为监督模块编写单元测试，覆盖所有决策路径。

**Why**：监督逻辑是确定性规则，适合单元测试；确保规则改变时不引入回归。

**How**：测试用例覆盖：

| 测试场景 | 预期决策 |
|---------|---------|
| 正常 finish | continue |
| 正常 complete_ticket | continue |
| 连续 3 次相同工具失败 | terminate (第 4 次) |
| 连续 3 轮相同 Action | terminate |
| 剩余迭代 2 次未完成 | continue + 建议 |
| 子工单全部失败 | review |
| 正常 tool_call 成功 | continue |
| 审批等待 | continue |

## Assumptions & Decisions（假设与决策）

1. **监督规则为确定性规则，不使用 LLM**：当前阶段采用硬编码规则（fail count、action 去重等），后续可扩展为 LLM 监督，但当前确定性规则更可靠、更快、成本更低。

2. **retry 消耗迭代配额**：`retry` 后 `for` 循环 `i` 自增，防止无限 retry。在 `maxIterations` 上限（默认 10）内，retry 有实际次数限制。

3. **监督不修改 prompt 内容**：监督 Observation 以 `createMessage` 方式写入消息队列，Agent 在下一轮读取消息时自然获得监督建议（与人类用户发消息的机制一致）。

4. **子工单失败不自动 fail 父工单**：仅在父工单写入风险提示消息，保留 supervisor 自主决策权。只有"全部子工单失败"才建议 review（不自动 fail）。

5. **supervision 事件复用现有 SSE 通道**：不新增 SSE endpoint，通过 `onEvent` 回调透传。

## Verification（验证步骤）

### 测试场景 1：工具连续失败 → terminate
1. 创建工单，配置一个必然失败的工具调用（如写一个不存在的路径）
2. 执行 Agent，观察第 3 次失败后监督是否置 `failed`
3. 前端是否显示 `[监督·终止]` 消息和 failed 状态

### 测试场景 2：Agent 进入循环 → terminate
1. 创建工单，让 Agent 执行一个容易重复的指令
2. 观察连续 3 轮相同 Action 后是否被监督终止
3. 确认消息中是否出现"检测到重复操作"

### 测试场景 3：子工单全部失败 → review
1. supervisor Agent 创建 2 个子工单，子工单均配置为必然失败
2. 观察父工单是否收到风险提示并进入 `reviewing` 状态
3. 前端 reviewing 状态的"审核通过/退回修改"按钮是否可用

### 测试场景 4：正常流程不受影响
1. 正常执行工单（如简单的文件读取+分析）
2. 确认监督不干扰正常 finish/complete_ticket 流程
3. 确认不会因监督产生多余的 error 或状态变更
