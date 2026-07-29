# 多Agent协作开发平台设计文档

## 1. 项目概述

### 1.1 核心目标
构建一个本地多Agent协作开发平台，支持：
- 定义、设计、修改Agent
- 创建项目并组建多Agent开发组
- Agent之间协作完成开发任务

### 1.2 核心使用场景
个人开发者管理多个Agent协作开发项目

### 1.3 形态
Web应用（本地启动服务，浏览器访问）

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────┐
│                 Web前端                      │
│  (Agent管理 | 项目管理 | 工单看板 | 对话界面) │
└─────────────────┬───────────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────────┐
│               后端服务 (Node.js + TS)        │
├─────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Agent模块 │ │ 工单模块 │ │   LLM模块    │ │
│  │          │ │          │ │              │ │
│  │ - 配置管理│ │ - 创建   │ │ - Ollama连接 │ │
│  │ - 生命周期│ │ - 流转   │ │ - 外部API    │ │
│  │ - 记忆   │ │ - 对话   │ │ - 路由切换   │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────────────────────────────────────┐│
│  │              工具模块                     ││
│  │  - 文件操作 | Shell执行 | 其他扩展       ││
│  │  - 权限审批                              ││
│  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            SQLite + 文件系统                 │
│  (Agent配置 | 工单 | 对话历史 | 项目文件)    │
└─────────────────────────────────────────────┘
```

### 2.2 目录结构

```
思思开发平台/
├── apps/
│   ├── backend/          # 后端服务
│   └── frontend/         # Web前端
├── data/
│   ├── agents/           # Agent全局配置
│   │   └── {agent-id}/
│   │       ├── config.yaml
│   │       └── memory.json
│   ├── projects/         # 项目数据
│   │   └── {project-id}/
│   │       ├── config.yaml
│   │       ├── tickets/
│   │       ├── agents/   # Agent项目级记忆
│   │       └── workspace/# 项目工作目录
│   └── platform.db       # SQLite数据库
└── docs/
```

---

## 3. Agent模块设计

### 3.1 Agent配置结构

```yaml
id: "frontend-developer"
name: "前端开发Agent"
role: "specialist"  # supervisor | specialist

# 模型配置
model:
  provider: "ollama"  # ollama | openai | anthropic
  name: "qwen2.5-coder:7b"
  
  # API Key配置（可选，不填则使用平台默认）
  api_key: "${ENV:OPENAI_API_KEY}"  # 支持环境变量引用
  
  fallback:  # 备用外部API
    provider: "openai"
    name: "gpt-4o-mini"
    api_key: "${ENV:OPENAI_API_KEY}"  # 可单独配置

# Prompt配置
prompt:
  system: |
    你是一个专业的前端开发工程师...
  personality: "专业、严谨、注重代码质量"

# 工具配置
tools:
  predefined:  # 从平台工具库选择
    - file_read
    - file_write
    - shell_execute
  custom: []   # 自定义工具（后续扩展）
  
  # 敏感操作审批配置
  approval_required:
    - shell_execute
    - file_delete

# 记忆配置
memory:
  global: true    # 是否启用全局记忆
  project: true   # 是否启用项目级记忆
```

### 3.2 API Key分层配置

优先级：Agent配置 > 平台配置

- 平台级配置：`data/platform.yaml`，提供默认API Key
- Agent级配置：Agent配置文件中可覆盖自己的API Key
- 支持环境变量引用：`${ENV:OPENAI_API_KEY}`

### 3.3 Agent生命周期

1. **定义阶段**：通过配置文件创建Agent
2. **项目加入**：将Agent加入项目开发组，初始化项目级记忆
3. **运行阶段**：接收工单、执行任务、对话协作
4. **退出项目**：保留项目记忆，可再次加入其他项目

### 3.4 主Agent特殊职责

- 用户交互接口（汇报进度、接收指令）
- WBS拆解与工单派发
- 进度汇总与问题上报

### 3.5 记忆机制

- **全局记忆**：Agent个人偏好、通用知识
- **项目级记忆**：项目上下文、历史对话、决策记录

### 3.6 Agent执行架构 (ReAct)

采用 ReAct (Reasoning + Acting) 架构，核心循环为：**思考 → 行动 → 观察**。

**执行流程：**

```
┌─────────────────────────────────────────────┐
│              ReAct 执行循环                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐                               │
│  │  思考     │ ← 分析当前状态，决定下一步     │
│  │ (Thought)│                               │
│  └────┬─────┘                               │
│       │                                     │
│       ▼                                     │
│  ┌──────────┐                               │
│  │  行动     │ ← 执行工具调用或对话           │
│  │ (Action) │                               │
│  └────┬─────┘                               │
│       │                                     │
│       ▼                                     │
│  ┌──────────┐                               │
│  │  观察     │ ← 获取执行结果                 │
│  │(Observation)                             │
│  └────┬─────┘                               │
│       │                                     │
│       ▼                                     │
│  ┌──────────┐                               │
│  │ 完成？    │                               │
│  └────┬─────┘                               │
│       │                                     │
│    是 │ 否                                  │
│       │ └───────┐                          │
│       ▼         │                          │
│    结束      循环回思考                      │
│                                             │
└─────────────────────────────────────────────┘
```

**Prompt结构：**

```
System: {agent配置中的system prompt}

可用工具:
{工具列表及描述}

当前工单:
{工单信息}

对话历史:
{messages}

记忆:
{全局记忆 + 项目级记忆}

思考-行动-观察历史:
Thought: {上一轮思考}
Action: {上一轮行动}
Observation: {上一轮结果}
...

现在请思考下一步:
```

**行动类型：**

| Action | 说明 |
|--------|------|
| `tool_call` | 调用工具执行操作 |
| `message` | 发送消息给其他Agent或用户 |
| `create_ticket` | 创建新工单 |
| `complete_ticket` | 标记工单完成 |
| `finish` | 结束本轮执行 |

**示例执行过程：**

```
Thought: 用户要求修改登录页面样式，我需要先查看当前的登录页面代码。
Action: tool_call(file_read, {path: "src/pages/Login.tsx"})
Observation: 文件内容已读取，发现使用了Tailwind CSS...

Thought: 现在我了解了代码结构，需要修改按钮样式。
Action: tool_call(file_write, {path: "src/pages/Login.tsx", content: "..."})
Observation: 文件已写入成功。

Thought: 修改完成，需要通知主Agent审核。
Action: message(to: "supervisor", content: "登录页面样式已修改，请审核")
Observation: 消息已发送。

Thought: 任务完成，等待审核反馈。
Action: finish()
```

**与工单系统的集成：**

- Agent执行循环绑定到具体工单
- 每轮Think-Act-Observe记录到工单的对话历史
- 工具调用需要审批时，循环暂停等待用户响应
- 多Agent协作时，Agent可相互发送消息，其他Agent在自己的工单中响应

---

## 4. 工单模块设计

### 4.1 工单数据结构

```typescript
interface Ticket {
  id: string;
  projectId: string;
  
  // 基本信息
  title: string;
  description: string;
  type: "task" | "bug" | "discussion" | "decision";
  priority: "high" | "medium" | "low";
  
  // 状态流转
  status: "pending" | "in_progress" | "reviewing" | "completed";
  
  // 分配信息
  assignee?: string;      // Agent ID
  createdBy: string;      // "user" | Agent ID
  supervisorId?: string;  // 主Agent ID（项目必填）
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // 关联信息
  parentTicketId?: string;
  dependencies?: string[];  // 依赖的其他工单
  
  // 对话历史（消息列表）
  messages: Message[];
}
```

### 4.2 工单创建流程

**项目启动时：**
1. 用户描述需求
2. 主Agent拆解为WBS
3. 系统批量创建工单

**协作过程中：**
1. Agent发现新需求
2. 自发创建工单
3. 通知相关人员

### 4.3 工单流转规则

| 当前状态 | 目标状态 | 触发条件 |
|---------|---------|---------|
| `pending` | `in_progress` | Agent认领或被指派 |
| `in_progress` | `reviewing` | Agent提交完成 |
| `reviewing` | `completed` | 用户或主Agent审核通过 |
| `reviewing` | `in_progress` | 审核退回，需修改 |

---

## 5. LLM模块设计

### 5.1 调用流程

```
Agent请求
    │
    ▼
┌─────────────────┐
│ 检查Ollama状态   │
│ - 服务是否可用   │
│ - 模型是否加载   │
│ - 资源是否充足   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  可用？  │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
   是        否
    │         │
    ▼         ▼
 Ollama    外部API
  调用      调用
    │         │
    └────┬────┘
         │
         ▼
      返回结果
```

### 5.2 Ollama状态检查

- 心跳检测：服务是否运行
- 模型检查：所需模型是否已拉取
- 资源监控：GPU显存/内存是否充足（简单判断）

### 5.3 外部API支持

- OpenAI（GPT-4o、GPT-4o-mini等）
- Anthropic（Claude系列）
- 其他兼容OpenAI接口的服务

### 5.4 平台级配置

```yaml
# data/platform.yaml
llm:
  ollama:
    baseUrl: "http://localhost:11434"
    enabled: true
    
  providers:
    openai:
      apiKey: "${ENV:OPENAI_API_KEY}"
      models: ["gpt-4o", "gpt-4o-mini"]
    anthropic:
      apiKey: "${ENV:ANTHROPIC_API_KEY}"
      models: ["claude-3.5-sonnet"]
```

---

## 6. 工具模块设计

### 6.1 平台基础工具库

| 工具名 | 功能 | 默认审批 |
|--------|------|----------|
| `file_read` | 读取文件内容 | 否 |
| `file_write` | 写入/创建文件 | 否 |
| `file_delete` | 删除文件 | 是 |
| `shell_execute` | 执行Shell命令 | 是 |
| `http_request` | 发送HTTP请求 | 否 |
| `code_search` | 代码库搜索 | 否 |
| `git_operation` | Git操作 | 否 |

### 6.2 工具执行流程

```
Agent调用工具
    │
    ▼
┌─────────────────┐
│ 检查工具权限     │
│ - Agent是否有此工具
│ - 是否需要审批   │
└────────┬────────┘
         │
    ┌────▼────┐
    │需审批？  │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
   否        是
    │         │
    ▼         ▼
 直接执行   创建审批请求
    │         │
    │    等待用户确认
    │         │
    │    ┌────┴────┐
    │   同意      拒绝
    │    │         │
    │    ▼         ▼
    │  执行      取消
    │         返回错误
    │
    ▼
 返回结果
```

### 6.3 审批请求结构

```typescript
interface ApprovalRequest {
  id: string;
  ticketId: string;
  agentId: string;
  toolName: string;
  params: Record<string, any>;
  reason: string;        // Agent说明为什么要执行
  status: "pending" | "approved" | "rejected";
  userResponse?: string; // 用户反馈
  createdAt: Date;
}
```

### 6.4 工具扩展机制（后续）

- 通过插件系统添加自定义工具
- 工具定义包含：名称、描述、参数Schema、执行函数

---

## 7. 前端设计

### 7.1 核心页面

| 页面 | 功能 |
|------|------|
| Agent管理 | 查看/创建/编辑Agent配置 |
| 项目管理 | 创建项目、配置开发组、设置主Agent |
| 工单看板 | 查看工单列表、状态筛选、拖拽流转 |
| 工单详情 | 对话界面、审批操作、执行日志 |
| 设置 | 平台配置（Ollama地址、API Key等） |

### 7.2 布局结构

```
┌────────────────────────────────────────────────┐
│  顶部导航栏                                    │
│  Logo | 项目选择 | 设置                        │
├────────┬───────────────────────────────────────┤
│        │  工单看板                             │
│ 侧边栏 │  ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│        │  │待 │ │进 │ │审 │ │已 │           │
│ Agent  │  │分 │ │行 │ │核 │ │完 │           │
│ 列表   │  │配 │ │中 │ │   │ │成 │           │
│        │  └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘           │
│ - 主   │    │    │    │    │               │
│ - 前   │    ▼    ▼    ▼    ▼               │
│ - 后   │  工单卡片...                       │
│ - 测   │                                      │
│        │─────────────────────────────────────│
│        │  对话面板（选中工单时显示）          │
└────────┴───────────────────────────────────────┘
```

### 7.3 技术选型

- 框架：React + TypeScript
- UI库：Ant Design
- 状态管理：Zustand
- 通信：fetch + WebSocket

---

## 8. 技术栈总结

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | React + TypeScript |
| 前端UI | Ant Design |
| 前端状态 | Zustand |
| 后端运行时 | Node.js |
| 后端语言 | TypeScript |
| 数据库 | SQLite |
| 配置格式 | YAML |
| 实时通信 | WebSocket |
| 本地LLM | Ollama |
| 外部API | OpenAI / Anthropic |

---

## 9. 后续扩展方向

1. **可视化Agent配置**：表单式界面配置Agent
2. **自定义工具插件系统**：支持用户扩展工具
3. **多项目并行**：支持同时运行多个项目
4. **Agent市场**：分享和复用Agent配置
5. **协作分析**：工单效率统计、Agent表现评估