# index.ts

- 源文件：`apps/backend/src/index.ts`
- 文件职责：后端服务入口：装配 Express 应用、注册各模块路由并初始化数据库。
- 具名函数/方法：0 个

## 模块说明

- 引入并挂载全部业务模块路由：
  - `/api/agents`、`/api/llm`、`/api/tickets`、`/api/projects`、`/api/tools`
  - `/api/approvals`、`/api/api-keys`、`/api/platform`、`/api/skills`
  - `/api/usage`（本次新增）：Token 用量查询路由，见 `modules/usage/routes.ts`
- 启动流程：`initDb()` 执行 schema（含新增 `token_usage` 表）→ 迁移项目/工单存储 → 同步内置 Agent → 监听端口。
- 优雅关闭：SIGINT/SIGTERM 时 `closeDb()`。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
