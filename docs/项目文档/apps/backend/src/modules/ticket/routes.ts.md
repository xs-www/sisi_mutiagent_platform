# routes.ts

- 源文件：`apps/backend/src/modules/ticket/routes.ts`
- 文件职责：HTTP 路由层：解析请求、调用业务能力并构造响应。
- 具名函数/方法：1 个

## 函数与方法

### `isValidTransition`（第 25 行）

- 类型：函数
- 签名：`function isValidTransition(from: TicketStatus, to: TicketStatus): boolean`
- 功能：检查 valid transition 是否满足约束。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
