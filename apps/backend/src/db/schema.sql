-- apps/backend/src/db/schema.sql

-- Agent表：存储Agent基本信息
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('supervisor', 'specialist')),
  config_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  supervisor_id TEXT,
  workspace_path TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supervisor_id) REFERENCES agents(id)
);

-- 项目成员表：Agent与项目的关联
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  UNIQUE(project_id, agent_id)
);

-- 工单表
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('task', 'bug', 'discussion', 'decision')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'reviewing', 'completed')),
  assignee_id TEXT,
  created_by TEXT NOT NULL,
  parent_ticket_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assignee_id) REFERENCES agents(id),
  FOREIGN KEY (parent_ticket_id) REFERENCES tickets(id)
);

-- 消息表：工单对话历史
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('agent', 'user', 'system')),
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'thought', 'action', 'observation')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- 审批请求表
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  params TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  user_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Agent记忆表
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  project_id TEXT,
  memory_type TEXT NOT NULL CHECK(memory_type IN ('global', 'project')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
-- Agent记忆向量表（用于RAG语义检索）
CREATE TABLE IF NOT EXISTS memory_vectors (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  vector TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- API Key管理表
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  max_concurrency INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  categories TEXT NOT NULL DEFAULT '["chat"]',
  models TEXT NOT NULL DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 平台模型池表：统一管理平台可用的LLM模型
CREATE TABLE IF NOT EXISTS platform_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skill包表：可复用的技能包定义
CREATE TABLE IF NOT EXISTS skill_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_ext TEXT NOT NULL CHECK(file_ext IN ('zip', 'skill')),
  file_size INTEGER NOT NULL DEFAULT 0,
  import_source TEXT NOT NULL DEFAULT 'upload' CHECK(import_source IN ('upload', 'legacy')),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 工具配置覆盖表
CREATE TABLE IF NOT EXISTS tool_overrides (
  tool_name TEXT PRIMARY KEY,
  approval_required INTEGER,
  is_enabled INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Token 用量明细表：按项目/工单/Agent 记录每次 LLM 调用的 token 消耗
-- 输入按「命中缓存 / 未命中缓存」区分，另计缓存写入与输出（缓存只作用于输入）
CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  ticket_id TEXT,
  agent_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'chat',
  input_cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
  input_cache_miss_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS custom_tools (
  tool_name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  approval_required INTEGER DEFAULT 0,
  params_json TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_agent ON project_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_agent ON memory_vectors(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_project ON token_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_ticket ON token_usage(ticket_id);
