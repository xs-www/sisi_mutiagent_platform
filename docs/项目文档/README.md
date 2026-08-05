# 项目代码函数文档

本文档集按项目源码目录镜像组织，供智能体快速定位文件职责、函数签名和主要副作用。

## 阅读约定

- 每个源码文件对应一个 Markdown 文件，包括没有具名函数的类型或出口文件。
- 收录函数声明、具名箭头函数、类/对象方法和 React 组件。
- 匿名内联回调归入所属具名函数，避免产生大量无法稳定引用的条目。
- “行为提示”来自静态分析，只用于快速导航，修改代码前仍应阅读源码与测试。

- 扫描范围：`apps/**/*.{ts,tsx,js,jsx}`（排除依赖及构建产物）
- 源码文件总数：104

## 最近更新（2026-08-05）

- 新建项目弹窗改造：项目名称必填；项目描述新增"AI 生成"按钮（调用后端 `POST /api/projects/generate-ai`，经 `chatWithPlatformModels` 生成描述并推荐应加入项目的 Agent，推荐结果并入"添加 Agent"选择）；主 Agent 默认项目监理（supervisor）；新增"添加 Agent"多选下拉，默认已选全部内置 Agent，自定义 Agent 可额外勾选，创建时补充加入所选自定义 Agent 与主 Agent（`modules/project/routes.ts`、`api/project.ts`、`pages/Projects.tsx`）
- Bug 修复：统一前后端 `Agent.isBuiltin` 字段名（后端为 `isBuiltin`，前端之前误写为 `isBuiltIn`，导致内置 Agent 判断恒为 `undefined`，前端无法区分内置/自定义 Agent，默认勾选与分组展示失效）。修复涉及 `types/index.ts`、`pages/Agents.tsx`、`pages/Projects.tsx`
- 修复 Agent 假完成：`action-parser` 无法解析的 Action 改为返回 `invalid`（原默认 `finish`）；`supervisor` 新增 `checkInvalidParse` 规则；`executor` 向监督层传入 `parsedActionType` 与子工单 `childResults`（`modules/agent/{action-parser,executor,supervisor}.ts`）
- 新增工具 `list_files` / `file_exists`：列出工作目录文件与检查路径是否存在，并扩充 git 白名单（`ls-files`/`ls-tree`/`describe`/`blame`/`grep`/`rev-list`/`cat-file`），项目创建时对 workspace 自动 `git init`（`modules/tools/{registry,implementations}.ts`、`modules/project/repository.ts`、`modules/agent/prompt-builder.ts`）
- 新增 Token 用量统计：`modules/usage/`（types/repository/routes/index）与前端 `api/usage.ts`
- LLM 返回新增 `usage` 细分（输入命中缓存 / 未命中 / 缓存写入 / 输出）：`modules/llm/{types,external,ollama,router}.ts`
- 前端页面展示 Token 消耗：`pages/Dashboard.tsx`、`pages/ProjectDetail.tsx`

## 目录

### `apps/backend/src`

- [apps/backend/src/config/index.ts](./apps/backend/src/config/index.ts.md)
- [apps/backend/src/db/index.ts](./apps/backend/src/db/index.ts.md)
- [apps/backend/src/index.ts](./apps/backend/src/index.ts.md)
- [apps/backend/src/modules/agent/action-parser.test.ts](./apps/backend/src/modules/agent/action-parser.test.ts.md)
- [apps/backend/src/modules/agent/action-parser.ts](./apps/backend/src/modules/agent/action-parser.ts.md)
- [apps/backend/src/modules/agent/events.ts](./apps/backend/src/modules/agent/events.ts.md)
- [apps/backend/src/modules/agent/executor.ts](./apps/backend/src/modules/agent/executor.ts.md)
- [apps/backend/src/modules/agent/index.ts](./apps/backend/src/modules/agent/index.ts.md)
- [apps/backend/src/modules/agent/loader.test.ts](./apps/backend/src/modules/agent/loader.test.ts.md)
- [apps/backend/src/modules/agent/loader.ts](./apps/backend/src/modules/agent/loader.ts.md)
- [apps/backend/src/modules/agent/orchestration.test.ts](./apps/backend/src/modules/agent/orchestration.test.ts.md)
- [apps/backend/src/modules/agent/orchestration.ts](./apps/backend/src/modules/agent/orchestration.ts.md)
- [apps/backend/src/modules/agent/prompt-builder.ts](./apps/backend/src/modules/agent/prompt-builder.ts.md)
- [apps/backend/src/modules/agent/routes.ts](./apps/backend/src/modules/agent/routes.ts.md)
- [apps/backend/src/modules/agent/types.ts](./apps/backend/src/modules/agent/types.ts.md)
- [apps/backend/src/modules/agent/supervisor.test.ts](./apps/backend/src/modules/agent/supervisor.test.ts.md)
- [apps/backend/src/modules/agent/supervisor.ts](./apps/backend/src/modules/agent/supervisor.ts.md)
- [apps/backend/src/modules/apikeys/concurrency.ts](./apps/backend/src/modules/apikeys/concurrency.ts.md)
- [apps/backend/src/modules/apikeys/index.ts](./apps/backend/src/modules/apikeys/index.ts.md)
- [apps/backend/src/modules/apikeys/repository.ts](./apps/backend/src/modules/apikeys/repository.ts.md)
- [apps/backend/src/modules/apikeys/routes.ts](./apps/backend/src/modules/apikeys/routes.ts.md)
- [apps/backend/src/modules/apikeys/types.ts](./apps/backend/src/modules/apikeys/types.ts.md)
- [apps/backend/src/modules/approval/index.ts](./apps/backend/src/modules/approval/index.ts.md)
- [apps/backend/src/modules/approval/repository.ts](./apps/backend/src/modules/approval/repository.ts.md)
- [apps/backend/src/modules/approval/routes.ts](./apps/backend/src/modules/approval/routes.ts.md)
- [apps/backend/src/modules/approval/types.ts](./apps/backend/src/modules/approval/types.ts.md)
- [apps/backend/src/modules/llm/external.ts](./apps/backend/src/modules/llm/external.ts.md)
- [apps/backend/src/modules/llm/index.ts](./apps/backend/src/modules/llm/index.ts.md)
- [apps/backend/src/modules/llm/ollama.ts](./apps/backend/src/modules/llm/ollama.ts.md)
- [apps/backend/src/modules/llm/router.ts](./apps/backend/src/modules/llm/router.ts.md)
- [apps/backend/src/modules/llm/routes.ts](./apps/backend/src/modules/llm/routes.ts.md)
- [apps/backend/src/modules/llm/types.ts](./apps/backend/src/modules/llm/types.ts.md)
- [apps/backend/src/modules/memory/index.ts](./apps/backend/src/modules/memory/index.ts.md)
- [apps/backend/src/modules/memory/manager.ts](./apps/backend/src/modules/memory/manager.ts.md)
- [apps/backend/src/modules/memory/types.ts](./apps/backend/src/modules/memory/types.ts.md)
- [apps/backend/src/modules/memory/embedding.ts](./apps/backend/src/modules/memory/embedding.ts.md)
- [apps/backend/src/modules/memory/service.ts](./apps/backend/src/modules/memory/service.ts.md)
- [apps/backend/src/modules/memory/long-term.ts](./apps/backend/src/modules/memory/long-term.ts.md)
- [apps/backend/src/modules/memory/short-term.ts](./apps/backend/src/modules/memory/short-term.ts.md)
- [apps/backend/src/modules/memory/vector-store.ts](./apps/backend/src/modules/memory/vector-store.ts.md)
- [apps/backend/src/modules/platform/index.ts](./apps/backend/src/modules/platform/index.ts.md)
- [apps/backend/src/modules/platform/repository.ts](./apps/backend/src/modules/platform/repository.ts.md)
- [apps/backend/src/modules/platform/routes.ts](./apps/backend/src/modules/platform/routes.ts.md)
- [apps/backend/src/modules/platform/types.ts](./apps/backend/src/modules/platform/types.ts.md)
- [apps/backend/src/modules/project/index.ts](./apps/backend/src/modules/project/index.ts.md)
- [apps/backend/src/modules/project/repository.ts](./apps/backend/src/modules/project/repository.ts.md)
- [apps/backend/src/modules/project/routes.ts](./apps/backend/src/modules/project/routes.ts.md)
- [apps/backend/src/modules/project/types.ts](./apps/backend/src/modules/project/types.ts.md)
- [apps/backend/src/modules/skill/index.ts](./apps/backend/src/modules/skill/index.ts.md)
- [apps/backend/src/modules/skill/repository.ts](./apps/backend/src/modules/skill/repository.ts.md)
- [apps/backend/src/modules/skill/routes.ts](./apps/backend/src/modules/skill/routes.ts.md)
- [apps/backend/src/modules/skill/types.ts](./apps/backend/src/modules/skill/types.ts.md)
- [apps/backend/src/modules/skill/validator.ts](./apps/backend/src/modules/skill/validator.ts.md)
- [apps/backend/src/modules/ticket/index.ts](./apps/backend/src/modules/ticket/index.ts.md)
- [apps/backend/src/modules/ticket/repository.ts](./apps/backend/src/modules/ticket/repository.ts.md)
- [apps/backend/src/modules/ticket/routes.ts](./apps/backend/src/modules/ticket/routes.ts.md)
- [apps/backend/src/modules/ticket/types.ts](./apps/backend/src/modules/ticket/types.ts.md)
- [apps/backend/src/modules/usage/index.ts](./apps/backend/src/modules/usage/index.ts.md)
- [apps/backend/src/modules/usage/repository.ts](./apps/backend/src/modules/usage/repository.ts.md)
- [apps/backend/src/modules/usage/routes.ts](./apps/backend/src/modules/usage/routes.ts.md)
- [apps/backend/src/modules/usage/types.ts](./apps/backend/src/modules/usage/types.ts.md)
- [apps/backend/src/modules/tools/executor.ts](./apps/backend/src/modules/tools/executor.ts.md)
- [apps/backend/src/modules/tools/implementations.test.ts](./apps/backend/src/modules/tools/implementations.test.ts.md)
- [apps/backend/src/modules/tools/implementations.ts](./apps/backend/src/modules/tools/implementations.ts.md)
- [apps/backend/src/modules/tools/index.ts](./apps/backend/src/modules/tools/index.ts.md)
- [apps/backend/src/modules/tools/registry.ts](./apps/backend/src/modules/tools/registry.ts.md)
- [apps/backend/src/modules/tools/routes.ts](./apps/backend/src/modules/tools/routes.ts.md)
- [apps/backend/src/modules/tools/types.ts](./apps/backend/src/modules/tools/types.ts.md)
- [apps/backend/src/types/index.ts](./apps/backend/src/types/index.ts.md)

### `apps/frontend/src`

- [apps/frontend/src/App.tsx](./apps/frontend/src/App.tsx.md)
- [apps/frontend/src/api/agent.ts](./apps/frontend/src/api/agent.ts.md)
- [apps/frontend/src/api/apikeys.ts](./apps/frontend/src/api/apikeys.ts.md)
- [apps/frontend/src/api/approval.ts](./apps/frontend/src/api/approval.ts.md)
- [apps/frontend/src/api/http.ts](./apps/frontend/src/api/http.ts.md)
- [apps/frontend/src/api/llm.ts](./apps/frontend/src/api/llm.ts.md)
- [apps/frontend/src/api/platform.ts](./apps/frontend/src/api/platform.ts.md)
- [apps/frontend/src/api/project.ts](./apps/frontend/src/api/project.ts.md)
- [apps/frontend/src/api/skill.ts](./apps/frontend/src/api/skill.ts.md)
- [apps/frontend/src/api/ticket.ts](./apps/frontend/src/api/ticket.ts.md)
- [apps/frontend/src/api/tools.ts](./apps/frontend/src/api/tools.ts.md)
- [apps/frontend/src/api/usage.ts](./apps/frontend/src/api/usage.ts.md)
- [apps/frontend/src/layouts/MainLayout.tsx](./apps/frontend/src/layouts/MainLayout.tsx.md)
- [apps/frontend/src/main.tsx](./apps/frontend/src/main.tsx.md)
- [apps/frontend/src/pages/Agents.tsx](./apps/frontend/src/pages/Agents.tsx.md)
- [apps/frontend/src/pages/ApiKeys.tsx](./apps/frontend/src/pages/ApiKeys.tsx.md)
- [apps/frontend/src/pages/Approvals.tsx](./apps/frontend/src/pages/Approvals.tsx.md)
- [apps/frontend/src/pages/Dashboard.tsx](./apps/frontend/src/pages/Dashboard.tsx.md)
- [apps/frontend/src/pages/NotFound.tsx](./apps/frontend/src/pages/NotFound.tsx.md)
- [apps/frontend/src/pages/PlatformSettings.tsx](./apps/frontend/src/pages/PlatformSettings.tsx.md)
- [apps/frontend/src/pages/ProjectDetail.tsx](./apps/frontend/src/pages/ProjectDetail.tsx.md)
- [apps/frontend/src/pages/Projects.tsx](./apps/frontend/src/pages/Projects.tsx.md)
- [apps/frontend/src/pages/SkillPacks.tsx](./apps/frontend/src/pages/SkillPacks.tsx.md)
- [apps/frontend/src/pages/TicketDetail.tsx](./apps/frontend/src/pages/TicketDetail.tsx.md)
- [apps/frontend/src/pages/Tickets.tsx](./apps/frontend/src/pages/Tickets.tsx.md)
- [apps/frontend/src/pages/ToolConfig.tsx](./apps/frontend/src/pages/ToolConfig.tsx.md)
- [apps/frontend/src/pages/Tools.tsx](./apps/frontend/src/pages/Tools.tsx.md)
- [apps/frontend/src/pages/Workflow.tsx](./apps/frontend/src/pages/Workflow.tsx.md)
- [apps/frontend/src/router/index.tsx](./apps/frontend/src/router/index.tsx.md)
- [apps/frontend/src/store/index.ts](./apps/frontend/src/store/index.ts.md)
- [apps/frontend/src/types/index.ts](./apps/frontend/src/types/index.ts.md)
- [apps/frontend/src/utils/index.ts](./apps/frontend/src/utils/index.ts.md)

### `apps/frontend/vite.config.d.ts`

- [apps/frontend/vite.config.d.ts](./apps/frontend/vite.config.d.ts.md)

### `apps/frontend/vite.config.js`

- [apps/frontend/vite.config.js](./apps/frontend/vite.config.js.md)

### `apps/frontend/vite.config.ts`

- [apps/frontend/vite.config.ts](./apps/frontend/vite.config.ts.md)
