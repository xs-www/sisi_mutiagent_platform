# sisi_mutiagent_platform

一个本地运行的多 Agent 协作开发平台，支持通过 Web 界面管理 Agent、项目、工单与审批流程，并驱动 Agent 执行任务。

## 核心能力

- Agent 管理：创建/编辑/删除 Agent，配置角色、Prompt、工具、记忆与 Skill 包
- 项目管理：创建项目、设置主 Agent、管理项目成员
- 工单看板：按状态流转 `pending -> in_progress -> reviewing -> completed`
- Agent 执行：支持工单驱动执行与 ReAct（思考-行动-观察）循环
- 工具系统：内置工具 + 自定义工具定义 + 直接执行调试
- 审批中心：对高风险工具调用进行审批通过/拒绝
- 模型与密钥管理：平台模型池、API Key 池（含并发配置）
- Skill 包管理：上传并管理 `.zip/.skill` 资源

## 技术栈

- 前端：React 18 + TypeScript + Vite + Ant Design + Zustand
- 后端：Node.js + TypeScript + Express
- 数据层：SQLite（`better-sqlite3`）+ `data/` 文件目录

## 项目结构

```text
apps/
  backend/        # 后端服务
  frontend/       # 前端应用
data/
  agents/
    builtin/      # 内置 Agent（基础信息由 git 追踪）
    custom/       # 用户自定义 Agent（git 不追踪）
  platform.db     # SQLite 数据库（运行后生成）
docs/
  项目文档/        # 项目静态函数文档
  specs/          # 设计文档
  plans/          # 迭代计划文档
```

## 快速开始

### 1) 启动后端

```bash
cd apps/backend
npm install
npm run dev
```

默认监听 `http://localhost:3000`，健康检查：`GET /health`。

### 2) 启动前端

```bash
cd apps/frontend
npm install
npm run dev
```

默认监听 `http://localhost:5173`，并将 `/api` 代理到 `http://localhost:3000`。

## 常用命令

### 后端（`apps/backend`）

- `npm run dev`：开发模式
- `npm run build`：TypeScript 构建
- `npm run start`：运行构建产物
- `npm run test`：运行测试（Vitest）

### 前端（`apps/frontend`）

- `npm run dev`：开发模式
- `npm run build`：构建
- `npm run preview`：预览构建结果
- `npm run lint`：TypeScript 类型检查

## 主要后端 API 模块

- `/api/agents`：Agent 管理与执行入口
- `/api/projects`：项目与成员管理
- `/api/tickets`：工单与消息
- `/api/tools`：工具定义、执行与审批联动
- `/api/approvals`：审批请求处理
- `/api/llm`：模型状态、模型列表与对话
- `/api/api-keys`：API Key 池管理
- `/api/platform`：平台模型池管理
- `/api/skills`：Skill 包管理

## 数据与配置说明

- 后端启动时会初始化 `data/platform.db` 并执行 schema
- 平台配置文件路径：`data/platform.yaml`（可选）
- Agent 分为内置（`data/agents/builtin/`）与用户自定义（`data/agents/custom/`）两部分：
  - git 仅追踪内置 Agent 的基础信息（`agent.yaml` / `prompt.md` / `tools.yaml`）
  - 内置 Agent 的记忆等运行时模块、任何用户自定义 Agent 均不被 git 追踪
- 内置示例 Agent 配置：
  - `data/agents/builtin/supervisor/agent.yaml`（项目监理）

## 当前状态与已知限制

- 目前已具备端到端基础功能（管理、建单、执行、审批、工具、模型配置）
- 待完善项可参考 `docs/260719todo.md`，包括：
  - 子工单创建后自动调度执行
  - 执行队列与并发控制
  - 审批通过后的自动恢复链路

