# Tasks

- [x] Task 1: 创建 Embedding Provider 抽象层及 OpenAI 实现
  - [x] 创建 `IEmbeddingProvider` 接口（embedText, embedBatch）
  - [x] 创建 `OpenAIEmbeddingProvider` 实现（调用 text-embedding-3-small）
  - [x] 添加 embedding 相关配置到环境变量（OPENAI_API_KEY, OPENAI_BASE_URL）
  - [x] 导出模块

- [x] Task 2: 创建向量存储层
  - [x] 创建 `IVectorStore` 接口（store, search, delete, clear）
  - [x] 创建 `SQLiteVectorStore` 实现：在 SQLite 中新建 `memory_vectors` 表（id, agent_id, vector JSON, content, metadata JSON, created_at）
  - [x] 实现余弦相似度计算函数
  - [x] 实现 `search()` 方法：加载该 agent 所有向量 → 计算余弦相似度 → 排序取 topK → 返回结果
  - [x] 实现 `store()` / `delete()` / `clear()` 方法
  - [x] 导出模块

- [x] Task 3: 实现短期记忆管理
  - [x] 创建 `ShortTermMemoryManager` 类
  - [x] 实现内存中的对话历史缓冲区（按 agentId + sessionId 分组）
  - [x] 实现基于 token 估算的滑动窗口裁剪（默认阈值 4000 tokens）
  - [x] 实现 `addMessage()` / `getContext()` / `clear()` 方法
  - [x] 导出模块

- [x] Task 4: 实现长期记忆管理（RAG 核心）
  - [x] 创建 `LongTermMemoryManager` 类，依赖 EmbeddingProvider + VectorStore
  - [x] 实现 `store()`：embedding → 存入向量存储 + 原始文本写入 agent_memories 表
  - [x] 实现 `retrieve(query, topK, threshold)`：embedding 查询 → 向量检索 → 相似度过滤
  - [x] 实现去重逻辑：新记忆与已有记忆余弦相似度 > 0.95 时跳过
  - [x] 导出模块

- [x] Task 5: 创建统一 MemoryService
  - [x] 创建 `MemoryService` 类，聚合 ShortTermMemoryManager + LongTermMemoryManager
  - [x] 实现 `getContextForPrompt(agentId, sessionId, currentQuery)`：返回格式化的短/长期记忆文本
  - [x] 实现 `recordInteraction(agentId, sessionId, role, content)`：追加短期 + 异步评估长期存储
  - [x] 实现 `addMemory()` / `deleteMemory()` 等便捷方法
  - [x] 导出模块，替代旧的 memory/index.ts 导出

- [x] Task 6: 集成到 Agent 执行流程
  - [x] 修改 `prompt-builder.ts`：使用 MemoryService.getContextForPrompt() 替代旧的 formatMemoriesForPrompt()
  - [x] 修改 `executor.ts`：在每个 ReAct 步骤完成后调用 recordInteraction()
  - [x] 确保 MemoryService 在应用启动时正确初始化

- [x] Task 7: 数据库迁移
  - [x] 在 schema.sql 中添加 `memory_vectors` 表定义
  - [x] 创建迁移脚本，对现有 agent_memories 数据不做破坏性变更

# Task Dependencies
- Task 2 依赖 Task 1（VectorStore 的 search 需要 embedding）
- Task 4 依赖 Task 1 + Task 2（LongTermMemoryManager 依赖两者）
- Task 5 依赖 Task 3 + Task 4（MemoryService 聚合两者）
- Task 6 依赖 Task 5（集成需要 MemoryService）
- Task 7 可与 Task 1-2 并行
