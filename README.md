# 思思多 Agent 协作开发平台

一个面向**个人开发者**的本地多 Agent 协作开发平台。通过 Web 界面管理 Agent、项目与工单，让多个 AI Agent 以 ReAct 循环协同完成开发任务。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| **Agent 管理** | 创建、编辑、删除 Agent；配置角色（supervisor / specialist）、系统 Prompt、工具权限、Skill 包与记忆模块 |
| **项目管理** | 创建项目、设置主 Agent、管理项目成员，每个项目拥有独立的 workspace 工作目录 |
| **工单看板** | 工单驱动任务执行，状态流转：`pending → in_progress → reviewing → completed`（含 `failed` / `blocked`） |
| **ReAct 执行引擎** | Agent 通过思考-行动-观察循环自主完成工单任务，支持父子工单串行编排与多 Agent 协作 |
| **工具系统** | 内置工具（文件读写、Shell 执行等）+ 自定义工具定义 + 直接执行调试；高风险工具调用进入审批队列 |
| **审批中心** | 人工审批高风险工具调用（通过 / 拒绝），保障本地操作安全 |
| **记忆系统** | 短期对话缓冲（滑动窗口）+ 长期语义向量检索，自动注入 Agent 上下文 |
| **模型与密钥管理** | 平台模型池（Ollama / OpenAI 兼容 API）+ API Key 池（支持并发配置与轮换） |
| **Skill 包管理** | 上传并管理 `.zip / .skill` 资源包，供 Agent 加载使用 |

---

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · TypeScript · Vite · Ant Design · Zustand |
| 后端 | Node.js · TypeScript · Express |
| 数据层 | SQLite（`better-sqlite3`）· `data/` 文件目录 |

---

## 📁 项目结构

```text
sisi_mutiagent_platform/
├── apps/
│   ├── backend/            # Node.js + Express 后端（端口 3000）
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── agent/      # Agent 加载、执行（ReAct / orchestration）
│   │       │   ├── tools/      # 工具注册、执行、审批联动
│   │       │   ├── memory/     # 短期 + 长期记忆管理
│   │       │   ├── llm/        # LLM 路由（Ollama + 外部 API）
│   │       │   ├── ticket/     # 工单与消息
│   │       │   ├── project/    # 项目与成员
│   │       │   ├── approval/   # 审批请求
│   │       │   ├── apikeys/    # API Key 池
│   │       │   ├── platform/   # 平台模型池
│   │       │   └── skill/      # Skill 包管理
│   │       ├── db/             # SQLite 初始化与 schema
│   │       └── config/         # 平台配置加载
│   └── frontend/           # React 18 + Vite 前端（端口 5173）
├── data/
│   ├── agents/
│   │   ├── builtin/        # 内置 Agent（git 追踪基础信息）
│   │   └── custom/         # 用户自定义 Agent（git 不追踪）
│   ├── projects/           # 项目数据与 workspace
│   ├── platform.db         # SQLite 数据库（运行时自动生成）
│   └── platform.yaml       # 平台全局配置（可选）
└── docs/
    ├── specs/              # 设计文档
    ├── plans/              # 迭代计划
    └── agent-development-guide.md  # Agent 开发手册
```

---

## 🚀 快速开始

### 一键启动（macOS）

```bash
./start-dev.sh
```

首次运行会自动检测 Node.js 环境（如缺失则通过 nvm 安装 v20），并安装前后端依赖，随后在两个 Terminal 窗口中分别启动服务。

### 手动启动

**启动后端**

```bash
cd apps/backend
npm install
npm run dev
# 监听 http://localhost:3000，健康检查：GET /health
```

**启动前端**

```bash
cd apps/frontend
npm install
npm run dev
# 监听 http://localhost:5173，/api 代理到 http://localhost:3000
```

打开浏览器访问 **http://localhost:5173** 即可使用。

---

## 🛠️ 常用命令

### 后端（`apps/backend`）

```bash
npm run dev      # 开发模式（ts-node-dev 热重载）
npm run build    # TypeScript 编译
npm run start    # 运行编译产物
npm run test     # 单元测试（Vitest）
```

### 前端（`apps/frontend`）

```bash
npm run dev      # 开发模式（Vite HMR）
npm run build    # 生产构建
npm run preview  # 预览构建结果
npm run lint     # TypeScript 类型检查
```

---

## 🔌 后端 API 概览

| 路由前缀 | 说明 |
|----------|------|
| `/api/agents` | Agent 管理与执行入口（含 SSE 流式事件） |
| `/api/projects` | 项目与成员管理 |
| `/api/tickets` | 工单 CRUD 与消息记录 |
| `/api/tools` | 工具定义、执行与审批联动 |
| `/api/approvals` | 审批请求处理 |
| `/api/llm` | 模型状态、列表与对话 |
| `/api/api-keys` | API Key 池管理 |
| `/api/platform` | 平台模型池管理 |
| `/api/skills` | Skill 包管理 |

> 完整 API 文档参见 `docs/agent-development-guide.md` 第 13 节。

---

## ⚙️ 数据与配置

- **数据库**：后端启动时自动初始化 `data/platform.db`（SQLite）
- **平台配置**：`data/platform.yaml`（可选），用于配置全局模型池等
- **Agent 目录**：
  - `data/agents/builtin/`：内置 Agent，git 追踪 `agent.yaml / prompt.md / tools.yaml`
  - `data/agents/custom/`：用户自定义 Agent，git 不追踪
  - Agent 的运行时记忆（向量索引等）均不被 git 追踪
- **项目工作目录**：`data/projects/{project-id}/workspace/`，Agent 文件操作严格限制在此目录内

---

## 📖 文档

- [Agent 开发手册](docs/agent-development-guide.md) — 完整的 Agent 配置、工具开发、记忆系统与 API 参考
- [平台设计文档](docs/specs/2026-07-29-multi-agent-platform-design.md) — 系统架构与模块设计
- [当前迭代 TODO](docs/260804todo.md) — 待实现功能与已知限制

