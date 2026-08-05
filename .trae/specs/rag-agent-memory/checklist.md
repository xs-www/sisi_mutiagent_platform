# Checklist

## Embedding Provider
- [x] `IEmbeddingProvider` 接口定义完整（embedText + embedBatch）
- [x] `OpenAIEmbeddingProvider` 正确调用 OpenAI embeddings API
- [x] 环境变量 OPENAI_API_KEY 缺失时有明确错误提示
- [x] 批量 embedding 支持（单次 API 调用处理多条文本）

## 向量存储
- [x] `memory_vectors` 表结构正确（id, agent_id, vector JSON, content, metadata JSON, created_at）
- [x] 余弦相似度计算正确（与 NumPy/PyTorch 实现一致）
- [x] `search()` 返回结果按相似度降序排列
- [x] `store()` 正确写入向量和元数据
- [x] `delete()` 和 `clear()` 正常工作

## 短期记忆
- [x] 对话历史按 agentId + sessionId 正确隔离
- [x] Token 滑动窗口裁剪正确工作（超阈值时移除最早记录）
- [x] `getContext()` 返回格式化文本

## 长期记忆（RAG）
- [x] `store()` 流程完整：embedding → 向量存储 → 原始文本存储
- [x] `retrieve()` 返回语义相似度最高的 topK 条记忆
- [x] 低于阈值的记忆被正确过滤
- [x] 去重逻辑正确（相似度 > 0.95 跳过）

## MemoryService 统一接口
- [x] `getContextForPrompt()` 返回短/长期记忆组合文本
- [x] `recordInteraction()` 正确更新短期记忆并触发长期记忆评估
- [x] 替代旧的 `formatMemoriesForPrompt()` 且功能正常

## Agent 集成
- [x] `prompt-builder.ts` 已切换为使用 MemoryService
- [x] `executor.ts` 在 ReAct 步骤后调用 recordInteraction()
- [x] 应用启动时 MemoryService 正确初始化

## 数据库
- [x] `schema.sql` 包含 `memory_vectors` 表定义
- [x] 现有 agent_memories 表不受影响
