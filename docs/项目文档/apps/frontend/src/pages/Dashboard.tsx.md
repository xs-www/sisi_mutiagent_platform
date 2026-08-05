# Dashboard.tsx

- 源文件：`apps/frontend/src/pages/Dashboard.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：3 个

## 函数与方法

### `formatTokens`（第 26 行）

- 类型：函数
- 签名：`function formatTokens(n: number): string`
- 功能：将 token 数格式化为千分位字符串。
- 行为提示：未识别到显著的外部副作用。

### `Dashboard`（第 30 行）

- 类型：React 组件
- 签名：`export default function Dashboard()`
- 功能：加载并展示平台概览、关键统计信息及各项目 Token 消耗排行表。
- 行为提示：包含异步操作；更新界面或运行时状态。
- 说明：本次改动——新增「各项目 Token 消耗」表格，展示每个项目的调用次数、输入命中缓存 / 输入未命中 / 输出 / 合计 token 及缓存命中率；数据来自 `GET /api/usage/summary`。

### `loadStats`（第 42 行）

- 类型：函数
- 签名：`async function loadStats()`
- 功能：并行加载 Agent、项目、审批与用量统计数据。
- 行为提示：包含异步操作；更新界面或运行时状态。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
