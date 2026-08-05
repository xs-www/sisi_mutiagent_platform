# usage.ts

- 源文件：`apps/frontend/src/api/usage.ts`
- 文件职责：前端 API 层：封装 Token 用量查询接口。
- 具名函数/方法：2 个

## 类型

### `ProjectUsageSummary`

- 结构：`{ projectId: string | null; projectName?: string; callCount; inputCacheHitTokens; inputCacheMissTokens; cacheWriteTokens; outputTokens; totalTokens }`
- 说明：与后端 `GET /api/usage/*` 返回结构对应。

## 函数与方法

### `getUsageSummary`（第 8 行）

- 类型：函数
- 签名：`export async function getUsageSummary(): Promise<ProjectUsageSummary[]>`
- 功能：请求 `GET /api/usage/summary`，获取全平台按项目聚合的 Token 用量排行。

### `getProjectUsage`（第 14 行）

- 类型：函数
- 签名：`export async function getProjectUsage(projectId: string): Promise<ProjectUsageSummary>`
- 功能：请求 `GET /api/usage/projects/:projectId`，获取单个项目的 Token 用量聚合。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
