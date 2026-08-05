# routes.ts

- 源文件：`apps/backend/src/modules/usage/routes.ts`
- 文件职责：HTTP 路由层：暴露 Token 用量聚合查询接口。
- 具名函数/方法：0 个

## 路由与接口

### `GET /api/usage/summary`

- 功能：返回全平台按项目聚合的 Token 用量排行（含项目名、调用次数、输入命中/未命中、缓存写入、输出、合计）。
- 出参：`ProjectUsageSummary[]`，按合计 token 降序。
- 异常：内部错误返回 `500 { error }`。

### `GET /api/usage/projects/:projectId`

- 功能：返回指定项目的 Token 用量聚合。
- 出参：`ProjectUsageSummary`；无记录时各字段为 0。
- 异常：内部错误返回 `500 { error }`。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
