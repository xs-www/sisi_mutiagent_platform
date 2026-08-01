# routes.ts

- 源文件：`apps/backend/src/modules/apikeys/routes.ts`
- 文件职责：HTTP 路由层：解析请求、调用业务能力并构造响应。
- 具名函数/方法：2 个

## 函数与方法

### `maskApiKey`（第 10 行）

- 类型：函数
- 签名：`function maskApiKey(key: string): string`
- 功能：实现 mask api key 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `toPublicApiKey`（第 18 行）

- 类型：函数
- 签名：`function toPublicApiKey(key: any)`
- 功能：将 to public api key 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
