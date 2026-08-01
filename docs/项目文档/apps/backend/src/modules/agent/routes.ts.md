# routes.ts

- 源文件：`apps/backend/src/modules/agent/routes.ts`
- 文件职责：HTTP 路由层：解析请求、调用业务能力并构造响应。
- 具名函数/方法：4 个

## 函数与方法

### `slugify`（第 13 行）

- 类型：函数
- 签名：`function slugify(text: string): string`
- 功能：实现 slugify 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `asString`（第 21 行）

- 类型：函数
- 签名：`function asString(v: unknown, fallback = ''): string`
- 功能：实现 as string 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `parseGeneratedConfig`（第 28 行）

- 类型：函数
- 签名：`function parseGeneratedConfig(content: string, validToolNames: string[]):`
- 功能：解析 generated config，转换为内部可用结构。
- 行为提示：可能抛出异常。

### `send`（第 301 行）

- 类型：箭头函数
- 签名：`send(event: AgentEvent): void`
- 功能：执行 send 工作流并返回处理结果。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
