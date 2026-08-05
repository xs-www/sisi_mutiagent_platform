# index.ts

- 源文件：`apps/backend/src/modules/usage/index.ts`
- 文件职责：模块出口：汇总并重新导出相邻模块的公共 API。
- 具名函数/方法：0 个

## 导出说明

- `export * from './types.js'`：Token 用量相关类型；
- `export * from './repository.js'`：Token 用量仓库方法（recordTokenUsage、getProjectUsageSummary、getAllProjectsUsageSummary）；
- `export { usageRouter } from './routes.js'`：HTTP 路由。

> 说明（本次改动）：新增导出 `./repository.js`，使其他模块可通过 `../usage/index.js` 使用 `recordTokenUsage` 等仓库方法，无需直接深入内部路径。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
