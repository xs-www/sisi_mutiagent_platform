# Agent 开发手册

> 适用平台：sisi_mutiagent_platform  
> 文档版本：2026-07

---

## 目录

1. [平台架构概览](#1-平台架构概览)
2. [核心概念](#2-核心概念)
3. [快速创建第一个 Agent](#3-快速创建第一个-agent)
4. [Agent 配置文件详解](#4-agent-配置文件详解)
5. [ReAct 执行框架](#5-react-执行框架)
6. [内置工具参考](#6-内置工具参考)
7. [自定义工具开发](#7-自定义工具开发)
8. [记忆系统](#8-记忆系统)
9. [审批机制](#9-审批机制)
10. [工单驱动流程](#10-工单驱动流程)
11. [多 Agent 协作](#11-多-agent-协作)
12. [LLM 模型配置](#12-llm-模型配置)
13. [REST API 参考](#13-rest-api-参考)
14. [调试与测试](#14-调试与测试)
15. [常见问题](#15-常见问题)

---

## 1. 平台架构概览

```
sisi_mutiagent_platform
├── apps/
│   ├── backend/          # Node.js + Express 后端（端口 3000）
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── agent/      # Agent 加载、执行、路由
│   │       │   ├── tools/      # 工具注册、执行、审批联动
│   │       │   ├── memory/     # Agent 记忆管理
│   │       │   ├── llm/        # LLM 路由（Ollama + 外部 API）
│   │       │   ├── ticket/     # 工单与消息
│   │       │   ├── project/    # 项目与成员
│   │       │   ├── approval/   # 审批请求
│   │       │   ├── apikeys/    # API Key 池
│   │       │   ├── platform/   # 平台模型池
│   │       │   └── skill/      # Skill 包管理
│   │       ├── db/             # SQLite 初始化与 schema
│   │       └── config/         # 平台配置加载
│   └── frontend/         # React 18 + Vite 前端（端口 5173）
├── data/
│   ├── agents/           # Agent 配置目录（每个 Agent 一个子目录）
│   ├── platform.db       # SQLite 数据库（运行时生成）
│   └── platform.yaml     # 平台全局配置（可选）
└── doc/                  # 开发文档
```

### 数据流

```
用户触发工单
    ↓
POST /api/agents/:id/execute
    ↓
executeAgent() —— ReAct 循环
    ↓
buildReActPrompt() → chatWithPlatformModels()
    ↓
parseAgentResponse() → executeAction()
    ↓
executeTool() / createTicket() / message()
    ↓
下一次迭代 或 finish/complete_ticket
```

---

## 2. 核心概念

### Agent

Agent 是平台的执行单元，分为两种角色：

| 角色 | 说明 |
|------|------|
| `supervisor` | 监理 Agent，负责需求分析、任务拆解、子工单分配 |
| `specialist` | 专家 Agent，执行具体任务（写代码、搜索、调用 API 等）|

每个 Agent 由一份 YAML 配置文件描述，存放在 `data/agents/<agent-id>/config.yaml`。

### 工单（Ticket）

工单是 Agent 的工作单元，状态流转为：

```
pending → in_progress → reviewing → completed
```

Agent 执行时绑定到具体工单，所有思考、行动、观察都以消息形式记录在工单中。

### 工具（Tool）

工具是 Agent 可调用的能力，分为：

- **内置工具**：平台预定义，包括文件操作、Shell 执行、HTTP 请求、Git 操作、代码搜索等
- **自定义工具**：通过 API 或前端界面创建，存储在数据库的 `custom_tools` 表中

部分工具标记为需审批（`approvalRequired: true`），执行时会暂停并等待人工确认。

### 记忆（Memory）

记忆分为两类：

| 类型 | 说明 | 作用域 |
|------|------|--------|
| `global` | 全局记忆 | 跨项目有效 |
| `project` | 项目记忆 | 仅在当前项目有效 |

记忆会在每次构建 Prompt 时自动注入到 system message 中。

---

## 3. 快速创建第一个 Agent

### 步骤一：创建配置目录

```bash
mkdir -p data/agents/my-agent
```

### 步骤二：编写配置文件

创建 `data/agents/my-agent/config.yaml`：

```yaml
id: my-agent
name: 我的第一个 Agent
role: specialist
prompt:
  system: |
    你是一个代码审查专家。
    收到工单后，你会：
    1. 阅读指定文件的代码
    2. 分析代码质量和潜在问题
    3. 将审查报告写入指定文件
  personality: 严谨、细致、善于发现问题
tools:
  predefined:
    - file_read
    - file_write
    - code_search
  approvalRequired: []
memory:
  global: true
  project: true
skills: []
```

### 步骤三：重启后端服务（同步 Agent 到数据库）

```bash
cd apps/backend
npm run dev
```

启动时会自动调用 `syncAgentsToDb()` 将 `data/agents/` 下所有 Agent 同步到数据库。

### 步骤四：验证 Agent 已加载

```bash
curl http://localhost:3000/api/agents
```

### 步骤五：触发执行

先创建工单，再触发 Agent 执行：

```bash
# 创建工单（需要先有项目）
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "title": "审查 src/utils.ts 代码质量",
    "description": "请审查 src/utils.ts 并将问题写入 review-report.md",
    "type": "task",
    "priority": "medium",
    "createdBy": "user"
  }'

# 触发 Agent 执行
curl -X POST http://localhost:3000/api/agents/my-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "上一步返回的工单ID",
    "projectId": "your-project-id"
  }'
```

---

## 4. Agent 配置文件详解

配置文件为 YAML 格式，路径：`data/agents/<id>/config.yaml`

### 完整字段说明

```yaml
# ==================== 基本信息 ====================

# Agent 唯一标识符（必填）
# 规则：只允许字母、数字、连字符，与目录名保持一致
id: my-agent

# Agent 显示名称（必填）
name: 我的 Agent

# Agent 角色（必填）
# 可选值：supervisor | specialist
role: specialist

# ==================== Prompt 配置 ====================
prompt:
  # 系统提示词（必填）
  # 决定 Agent 的行为模式与职责范围
  # 支持多行文本，使用 | 或 > 折叠块
  system: |
    你是一个XXX专家。
    你的职责是：
    1. ...
    2. ...

  # 性格特征（可选）
  # 注入在 system prompt 之后，补充 Agent 个性
  personality: 严谨、耐心、务实

# ==================== 工具配置 ====================
tools:
  # 预定义工具白名单（必填）
  # 只有列在此处的工具，Agent 才有权限调用
  predefined:
    - file_read
    - file_write
    - file_delete        # 需审批
    - shell_execute      # 需审批
    - http_request
    - code_search
    - git_operation
    - get_project_members
    - create_ticket

  # 自定义工具（可选）
  # 从平台注册的自定义工具名称列表
  custom: []

  # Agent 级审批要求（可选）
  # 在此列出的工具，即使平台未标记为 approvalRequired，
  # 该 Agent 调用时也需要审批
  approvalRequired:
    - shell_execute

# ==================== 记忆配置 ====================
memory:
  # 是否启用全局记忆（跨项目）
  global: true
  # 是否启用项目记忆（仅当前项目）
  project: true

# ==================== Skill 包（可选）====================
# 关联的 Skill 包 ID 列表
# Skill 包目前为资源文件管理，后续版本将支持能力注入
skills: []
```

### 配置更新方式

**方式 1：直接编辑 YAML 文件后重启服务**

**方式 2：通过 API 实时更新（无需重启）**

```bash
curl -X PUT http://localhost:3000/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的名称",
    "prompt": {
      "system": "新的系统提示词"
    }
  }'
```

> 注意：通过 API 更新时，`id` 字段不允许修改。

---

## 5. ReAct 执行框架

平台采用 **ReAct（Reasoning + Acting）** 框架驱动 Agent 执行，每轮循环包含三个阶段：

```
Thought（思考）→ Action（行动）→ Observation（观察）→ 下一轮
```

### 执行流程

```
executeAgent(agent, ticketId, projectId)
    │
    ├─ 将工单状态改为 in_progress
    ├─ 写入 system 消息："Agent X 开始处理工单"
    │
    └─ ReAct 循环（最多 10 次迭代）
           │
           ├─ buildReActPrompt()      构建包含工单、历史、记忆的 Prompt
           ├─ chatWithPlatformModels() 调用 LLM
           ├─ parseAgentResponse()    解析 Thought + Action
           ├─ 写入 thought 消息
           ├─ executeAction()         执行行动
           ├─ 写入 action + observation 消息
           │
           ├─ 若 Action = finish()          → 终止循环
           └─ 若 Action = complete_ticket() → 工单状态改为 reviewing，终止循环
```

### LLM 输出格式要求

Agent 每次必须严格按照以下格式输出：

```
Thought: 你的思考过程，分析当前情况和下一步计划
Action: 具体的行动指令
```

**错误示例（会被解析为 finish）：**

```
我需要先读取文件，然后再分析。
tool_call(file_read, {"path": "src/main.ts"})
```

**正确示例：**

```
Thought: 我需要先读取 src/main.ts 的内容，了解代码结构，然后进行分析。
Action: tool_call(file_read, {"path": "src/main.ts"})
```

### 行动类型

| 行动 | 语法 | 说明 |
|------|------|------|
| 调用工具 | `tool_call(工具名, {参数JSON})` | 调用已授权工具 |
| 发送消息 | `message(to: "agentId或user", content: "内容")` | 向其他成员发消息 |
| 创建工单 | `create_ticket(title: "标题", description: "描述", type: "task", assignee: "agentId")` | 创建子工单 |
| 完成工单 | `complete_ticket()` | 标记工单待审核，结束执行 |
| 结束执行 | `finish()` | 不改变工单状态，结束本轮执行 |

### 迭代上限与自定义

默认最大迭代次数为 **10 次**。可在调用时自定义：

```bash
curl -X POST http://localhost:3000/api/agents/my-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "xxx",
    "projectId": "yyy",
    "maxIterations": 20,
    "temperature": 0.3
  }'
```

---

## 6. 内置工具参考

以下工具在平台中预先注册，可直接在 Agent 的 `tools.predefined` 中引用。

### 6.1 file_read — 读取文件

- **分类**：file
- **需审批**：否
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | ✅ | 相对于项目工作目录的文件路径 |

- **示例**：

```
Action: tool_call(file_read, {"path": "src/index.ts"})
```

- **安全限制**：只允许相对路径，不能访问工作目录之外的文件。

---

### 6.2 file_write — 写入文件

- **分类**：file
- **需审批**：否
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | ✅ | 相对路径，文件不存在则自动创建（含父目录）|
| `content` | string | ✅ | 写入内容（覆盖模式）|

- **示例**：

```
Action: tool_call(file_write, {"path": "output/report.md", "content": "# 审查报告\n..."})
```

---

### 6.3 file_delete — 删除文件

- **分类**：file
- **需审批**：**是**
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | ✅ | 要删除的文件相对路径 |

---

### 6.4 shell_execute — 执行 Shell 命令

- **分类**：shell
- **需审批**：**是**
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `command` | string | ✅ | Shell 命令（在工作目录下执行）|
| `timeout_ms` | number | 否 | 超时毫秒数，默认 30000 |

- **示例**：

```
Action: tool_call(shell_execute, {"command": "npm test", "timeout_ms": 60000})
```

- **安全限制**：内置危险命令黑名单（如 `rm -rf /`、`dd if=` 等会被拒绝）。

---

### 6.5 http_request — HTTP 请求

- **分类**：network
- **需审批**：否
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | ✅ | 请求 URL |
| `method` | string | 否 | HTTP 方法，默认 GET |
| `body` | string | 否 | 请求体（POST/PUT 时使用）|

- **限制**：响应体截取前 10000 字符，最大响应 5MB，最多 5 次重定向。

---

### 6.6 code_search — 代码搜索

- **分类**：code
- **需审批**：否
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | ✅ | 搜索关键词（大小写不敏感）|
| `path` | string | 否 | 限定搜索子目录，默认全量搜索 |

- **限制**：最多返回 50 条匹配，自动跳过 `node_modules`、`.git`、`dist`、`build` 以及二进制文件。

---

### 6.7 git_operation — Git 操作

- **分类**：git
- **需审批**：否（commit/push/pull 等写操作仍可执行，但建议通过审批控制）
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `command` | string | ✅ | Git 子命令：`status`/`log`/`add`/`diff`/`branch`/`tag`/`show`/`fetch`/`remote`/`config`/`rev-parse`/`checkout`/`commit`/`push`/`pull`/`reset` |
| `args` | array | 否 | 命令参数数组 |

- **示例**：

```
Action: tool_call(git_operation, {"command": "status"})
Action: tool_call(git_operation, {"command": "log", "args": ["--oneline", "-10"]})
```

---

### 6.8 get_project_members — 获取项目成员

- **分类**：project
- **需审批**：否
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `projectId` | string | 否 | 项目 ID，不填则从当前工单自动推断 |

- **返回**：项目成员列表（包含 agentId、agentName、role、isSupervisor）

---

### 6.9 create_ticket — 创建工单

- **分类**：project
- **需审批**：否
- **参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `projectId` | string | 否 | 项目 ID，不填则从当前工单推断 |
| `title` | string | ✅ | 工单标题 |
| `description` | string | 否 | 工单描述 |
| `type` | string | 否 | `task`/`bug`/`discussion`/`decision`，默认 `task` |
| `priority` | string | 否 | `high`/`medium`/`low`，默认 `medium` |
| `assignee` | string | 否 | 指派对象的 `agentId` 或名称 |

> 💡 **提示**：通过 `Action: create_ticket(...)` 语法也可直接创建工单（Action 类型，非 tool_call），系统会自动解析并执行。

---

## 7. 自定义工具开发

### 7.1 通过 API 注册自定义工具

```bash
curl -X POST http://localhost:3000/api/tools/custom \
  -H "Content-Type: application/json" \
  -d '{
    "name": "send_notification",
    "description": "发送钉钉通知。参数: { webhook: string, message: string }",
    "category": "custom",
    "approvalRequired": false,
    "params": [
      {
        "name": "webhook",
        "type": "string",
        "required": true,
        "description": "钉钉 Webhook URL"
      },
      {
        "name": "message",
        "type": "string",
        "required": true,
        "description": "通知内容"
      }
    ]
  }'
```

### 7.2 自定义工具的数据结构

```typescript
interface ToolDefinition {
  name: string;                                                      // 工具唯一名称
  description: string;                                               // 描述（会注入 Prompt）
  category: 'file' | 'shell' | 'network' | 'git' | 'code' | 'project' | 'custom';
  approvalRequired: boolean;                                         // 是否需要审批
  params: ToolParam[];                                               // 参数定义
}

interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  description: string;
}
```

### 7.3 工具覆盖（修改内置工具审批策略）

可以覆盖内置工具的 `approvalRequired` 配置：

```bash
# 将 shell_execute 改为无需审批（谨慎操作！）
curl -X POST http://localhost:3000/api/tools/overrides \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "shell_execute",
    "approvalRequired": false
  }'
```

### 7.4 在 Agent 中引用自定义工具

将自定义工具名称添加到 Agent 的 `tools.predefined` 列表，或通过 `tools.custom` 字段指定：

```yaml
tools:
  predefined:
    - file_read
    - file_write
    - send_notification  # 自定义工具，需已在平台注册
  custom:
    - my-special-tool
```

> ⚠️ **注意**：目前自定义工具仅完成了元数据注册，实际执行逻辑需要在 `apps/backend/src/modules/tools/implementations.ts` 的 `executeToolImplementation` 函数中添加对应的 `case`。

---

## 8. 记忆系统

### 8.1 记忆类型

| 类型 | 键 | 作用域 | 典型用途 |
|------|----|--------|---------|
| 全局记忆 | `global` | 所有项目 | Agent 的个人偏好、通用知识、跨项目经验 |
| 项目记忆 | `project` | 单个项目 | 项目架构、模块约定、临时规则 |

### 8.2 启用记忆

在 Agent 配置文件中：

```yaml
memory:
  global: true   # 全局记忆注入 Prompt
  project: true  # 项目记忆注入 Prompt
```

### 8.3 通过 API 管理记忆

**添加记忆：**

```bash
curl -X POST http://localhost:3000/api/agents/my-agent/memories \
  -H "Content-Type: application/json" \
  -d '{
    "memoryType": "global",
    "content": "该 Agent 倾向于在写入文件前先读取已有内容，避免覆盖"
  }'

# 添加项目记忆（需要 projectId）
curl -X POST http://localhost:3000/api/agents/my-agent/memories \
  -H "Content-Type: application/json" \
  -d '{
    "memoryType": "project",
    "projectId": "proj-001",
    "content": "本项目使用 pnpm 作为包管理器，禁止使用 npm install"
  }'
```

**查看记忆：**

```bash
curl http://localhost:3000/api/agents/my-agent/memories
curl http://localhost:3000/api/agents/my-agent/memories?projectId=proj-001
```

### 8.4 记忆在 Prompt 中的注入形式

每次 ReAct 循环的 system message 会自动包含：

```
## 记忆
## 全局记忆
- 该 Agent 倾向于在写入文件前先读取已有内容，避免覆盖

## 项目记忆
- 本项目使用 pnpm 作为包管理器，禁止使用 npm install
```

---

## 9. 审批机制

### 9.1 触发审批的条件

满足以下任意条件时，工具调用会暂停并生成审批请求：

1. 平台层面：工具定义中 `approvalRequired: true`（默认涉及 `file_delete`、`shell_execute`）
2. Agent 层面：Agent 配置中 `tools.approvalRequired` 列表包含该工具

### 9.2 审批流程

```
Agent 调用需审批工具
    ↓
createApprovalRequest() → 生成审批记录（status: pending）
    ↓
返回 ApprovalRequiredResult 给 Agent
    ↓
Agent 在 Observation 中收到："工具 X 需要用户审批，请在审批中心处理。审批ID: xxx"
    ↓
用户在前端审批中心 或 通过 API 处理
    ↓
POST /api/approvals/:id/approve  或  POST /api/approvals/:id/reject
```

### 9.3 审批 API

```bash
# 获取所有待审批请求
curl http://localhost:3000/api/approvals?status=pending

# 审批通过
curl -X POST http://localhost:3000/api/approvals/<approvalId>/approve \
  -H "Content-Type: application/json" \
  -d '{"userResponse": "已确认，允许执行"}'

# 拒绝
curl -X POST http://localhost:3000/api/approvals/<approvalId>/reject \
  -H "Content-Type: application/json" \
  -d '{"userResponse": "操作风险过高，请换一种方式"}'
```

> ⚠️ **当前限制**：审批通过后，Agent 不会自动恢复执行，需要再次手动触发工单执行。审批结果会记录在消息历史中，Agent 下次执行时可感知到之前的上下文。

---

## 10. 工单驱动流程

### 10.1 工单状态机

```
pending ──────────────────► in_progress
                                │
                    ┌───────────┤
                    │           │
                    ▼           ▼
               reviewing    (Agent 调用 finish，状态不变)
                    │
                    ▼
               completed（人工或系统完成）
```

| 状态 | 说明 |
|------|------|
| `pending` | 工单等待处理 |
| `in_progress` | Agent 正在执行 |
| `reviewing` | Agent 调用 `complete_ticket()` 后，等待人工审核 |
| `completed` | 工单已完成 |

### 10.2 工单类型

| 类型 | 说明 |
|------|------|
| `task` | 普通任务 |
| `bug` | 缺陷修复 |
| `discussion` | 讨论 |
| `decision` | 决策 |

### 10.3 父子工单

Agent 可以在执行过程中创建子工单（`parentTicketId` 指向父工单）：

```
主工单（由用户创建）
├── 子工单 1（由 supervisor agent 创建并分配给 specialist A）
├── 子工单 2（由 supervisor agent 创建并分配给 specialist B）
└── 子工单 3（由 supervisor agent 创建并分配给 specialist C）
```

---

## 11. 多 Agent 协作

### 11.1 项目与成员

多 Agent 协作以**项目**为单位组织：

```bash
# 创建项目
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "电商平台重构",
    "description": "重构旧版电商系统",
    "supervisorId": "supervisor"
  }'

# 添加项目成员
curl -X POST http://localhost:3000/api/projects/<projectId>/members \
  -H "Content-Type: application/json" \
  -d '{"agentId": "backend-dev"}'

curl -X POST http://localhost:3000/api/projects/<projectId>/members \
  -H "Content-Type: application/json" \
  -d '{"agentId": "frontend-dev"}'
```

### 11.2 任务分解模式（Supervisor + Specialists）

推荐的多 Agent 协作模式：

1. **用户**创建主工单，分配给 `supervisor` Agent
2. **supervisor** 执行时分析需求，创建子工单并分配给各 specialist
3. **specialist** 执行子工单，完成后调用 `complete_ticket()` 等待审核
4. **supervisor** 汇总结果，向用户汇报

**supervisor 配置示例：**

```yaml
id: supervisor
name: 项目监理
role: supervisor
prompt:
  system: |
    你是项目监理Agent，负责协调整个团队。
    收到需求后，你需要：
    1. 调用 get_project_members 获取当前团队成员
    2. 将需求拆解为独立子任务
    3. 用 create_ticket 为每个子任务创建工单，并分配给合适成员
    4. 用 finish() 结束本轮（子工单会由对应成员处理）
  personality: 善于沟通、逻辑清晰、分工明确
tools:
  predefined:
    - get_project_members
    - create_ticket
    - file_read
    - http_request
memory:
  global: true
  project: true
```

### 11.3 Prompt 中的成员信息

如果 `executeAgent` 调用时传入了 `projectId`，系统会自动将项目成员列表注入 system prompt：

```
## 当前项目成员（可分配对象）
- 项目监理 [supervisor] (supervisor)
- 后端开发 [backend-dev] (specialist)
- 前端开发 [frontend-dev] (specialist)
分配工单时必须优先从以上成员中选择 assignee，且优先使用 agentId 而不是显示名。
```

---

## 12. LLM 模型配置

### 12.1 支持的模型提供商

| 提供商 | provider 标识 | 说明 |
|--------|--------------|------|
| Ollama（本地）| `ollama` | 本地部署，无需 API Key |
| OpenAI | `openai` | GPT 系列 |
| Kimi | `kimi` | 月之暗面 |
| 通义千问 | `qwen` | 阿里云 |
| DeepSeek | `deepseek` | DeepSeek |
| 百炼 | `bailian` | 阿里云百炼 |
| Anthropic | `anthropic` | Claude 系列 |

### 12.2 配置平台模型池（推荐）

在前端「平台设置」→「模型池」中添加，或通过 API：

```bash
# 添加平台模型
curl -X POST http://localhost:3000/api/platform/models \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "modelName": "deepseek-chat",
    "priority": 1,
    "isActive": true
  }'

# 添加 API Key
curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "name": "主用密钥",
    "apiKey": "sk-xxxx",
    "maxConcurrency": 3
  }'
```

### 12.3 模型选择策略

系统自动按以下优先级选择模型：

1. **有可用并发的外部模型**（按 priority 升序，值越小优先级越高）
2. **外部模型（并发已满但仍可尝试）**
3. **本地 Ollama 模型**

如果所有模型都失败，Agent 执行会记录 `LLM调用失败` 错误并终止。

### 12.4 使用 platform.yaml 配置（备用方式）

```yaml
# data/platform.yaml
server:
  port: 3000

llm:
  ollama:
    baseUrl: http://localhost:11434
    enabled: true
  providers:
    deepseek:
      apiKey: sk-xxx
      models:
        - deepseek-chat
    openai:
      apiKey: sk-xxx
      models:
        - gpt-4o
        - gpt-4o-mini
```

---

## 13. REST API 参考

### Agent API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/agents` | 获取所有 Agent |
| `GET` | `/api/agents/:id` | 获取单个 Agent |
| `GET` | `/api/agents/:id/config` | 获取 Agent 配置详情 |
| `POST` | `/api/agents` | 创建 Agent |
| `PUT` | `/api/agents/:id` | 更新 Agent |
| `DELETE` | `/api/agents/:id` | 删除 Agent |
| `POST` | `/api/agents/:id/execute` | 触发 Agent 执行工单 |

**执行接口请求体：**

```json
{
  "ticketId": "string（必填）",
  "projectId": "string（可选）",
  "maxIterations": 10,
  "temperature": 0.7
}
```

### 工单 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/tickets` | 获取工单列表（支持 projectId/status 筛选）|
| `GET` | `/api/tickets/:id` | 获取工单详情 |
| `POST` | `/api/tickets` | 创建工单 |
| `PUT` | `/api/tickets/:id` | 更新工单 |
| `GET` | `/api/tickets/:id/messages` | 获取工单消息历史 |

### 工具 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/tools` | 获取所有工具定义（含自定义）|
| `POST` | `/api/tools/execute` | 直接执行工具（调试用）|
| `POST` | `/api/tools/custom` | 注册自定义工具 |
| `DELETE` | `/api/tools/custom/:name` | 删除自定义工具 |
| `POST` | `/api/tools/overrides` | 覆盖工具审批配置 |

### 审批 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/approvals` | 获取审批列表 |
| `GET` | `/api/approvals/:id` | 获取审批详情 |
| `POST` | `/api/approvals/:id/approve` | 批准 |
| `POST` | `/api/approvals/:id/reject` | 拒绝 |

---

## 14. 调试与测试

### 14.1 直接执行工具调试

无需创建 Agent，可直接调用工具接口进行测试：

```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "file_read",
    "params": { "path": "README.md" },
    "workspacePath": "/absolute/path/to/your/project"
  }'
```

### 14.2 查看 Agent 执行日志

所有工单消息（包括 thought、action、observation）均存储在数据库中：

```bash
curl http://localhost:3000/api/tickets/<ticketId>/messages
```

返回示例：

```json
[
  { "senderType": "system", "messageType": "text", "content": "Agent 项目监理 开始处理工单" },
  { "senderType": "agent",  "messageType": "thought", "content": "我需要先了解项目结构..." },
  { "senderType": "agent",  "messageType": "action",  "content": "Action: tool_call(file_read, {\"path\": \"README.md\"})" },
  { "senderType": "system", "messageType": "observation", "content": "[工具 file_read 执行成功]\n# 项目说明..." }
]
```

### 14.3 运行单元测试

```bash
cd apps/backend
npm run test
```

测试覆盖：
- `action-parser.test.ts`：Action 解析逻辑测试
- `implementations.test.ts`：工具实现测试

### 14.4 常用调试 API

```bash
# 健康检查
curl http://localhost:3000/health

# 查看平台 LLM 状态（Ollama 模型、外部 API 状态）
curl http://localhost:3000/api/llm/status

# 列出所有可用工具（含自定义工具）
curl http://localhost:3000/api/tools

# 查看所有审批（含历史）
curl http://localhost:3000/api/approvals
```

---

## 15. 常见问题

### Q1：Agent 执行后报"平台未配置任何可用模型"

**原因**：未配置 LLM 模型或 API Key。

**解决**：
1. 如使用本地 Ollama，确保 Ollama 已启动并加载了模型（`ollama pull deepseek-coder`）
2. 如使用外部 API，在前端「平台设置」→「API Key」中添加对应密钥，并在「模型池」中添加对应模型

---

### Q2：Agent 一直在循环，没有调用 finish() 或 complete_ticket()

**原因**：LLM 输出格式不符合规范，或任务复杂度超出模型能力。

**解决**：
- 检查 system prompt，明确要求模型使用 `Action: finish()` 结束
- 降低 `maxIterations` 限制（如调整为 5）
- 换用推理能力更强的模型
- 在 system prompt 中给出更清晰的行动边界

---

### Q3：工具调用被"暂停等待审批"后 Agent 不继续

**原因**：当前平台设计上，审批通过后 Agent 不会自动恢复。

**解决**：
- 审批通过后，重新调用 `POST /api/agents/:id/execute`，并传入相同的 `ticketId`
- Agent 会读取已有的消息历史（包含上次执行结果），在上下文基础上继续工作

---

### Q4：如何让 Agent 感知到自定义工具的描述

在 prompt-builder 的 `TOOL_DESCRIPTIONS` 中，只有内置工具有描述。自定义工具描述会在 Prompt 中显示为"工具名"本身。

可以在 Agent 的 `prompt.system` 中手动说明自定义工具的用法：

```yaml
prompt:
  system: |
    你可以使用以下工具：
    - send_notification: 发送钉钉通知，参数 { webhook: string, message: string }
```

---

### Q5：如何持久化存储 Agent 在执行中学到的信息

在 system prompt 中指示 Agent 调用记忆相关的行动，或通过 API 手动添加：

```bash
curl -X POST http://localhost:3000/api/agents/my-agent/memories \
  -H "Content-Type: application/json" \
  -d '{
    "memoryType": "project",
    "projectId": "proj-001",
    "content": "该项目的数据库连接字符串在 .env 文件的 DATABASE_URL 变量中"
  }'
```

---

### Q6：修改了 YAML 配置文件后不生效

修改 YAML 文件后需要重启后端服务，或通过 `PUT /api/agents/:id` 接口实时更新（API 更新会同时修改 YAML 文件和数据库）。

---

*文档由平台团队维护，如有问题欢迎提交工单或查看 `docs/specs/` 中的设计文档。*
