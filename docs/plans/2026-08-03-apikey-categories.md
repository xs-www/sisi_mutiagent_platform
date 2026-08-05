# API Key 模型类别支持

> **目标:** 为 API Key 增加 `categories` 能力标签，让用户可以指定 Key 的用途（对话、嵌入、多模态、代码），解决 DeepSeek 用户无法使用长期记忆（缺少 Embedding API Key）的问题。

**关联 Issue:** `[prompt-builder] 记忆检索失败: No API key available for embeddings`

**分支:** `rag_development`

---

## 背景

当前 `api_keys` 表只有 `provider` 字段标识 LLM 提供商（openai/deepseek/kimi 等），没有区分 Key 的具体用途。导致：

1. `embedding.ts` 硬编码查找 `getActiveApiKeysByProvider('openai')` → DeepSeek 用户无 OpenAI Key → 长期记忆完全不可用
2. 同一 OpenAI Key 同时用于对话和嵌入时，无法分别控制并发/计费
3. 未来新增多模态、代码等模型类别时，缺乏扩展性

## 方案设计

### 类别定义

| 类别值 | 标签 | 说明 | 当前调用方 |
|--------|------|------|-----------|
| `chat` | 对话补全 | LLM 文本对话、ReAct 推理 | `llm/router.ts` |
| `embedding` | 嵌入 | 文本向量化、语义检索 | `memory/embedding.ts` |
| `multimodal` | 多模态 | 图像/音频理解与生成 | 未来扩展 |
| `coding` | 代码 | 代码补全/生成专用 | 未来扩展 |

### 存储格式

- `api_keys` 表新增 `categories` 字段，类型 `TEXT`，存储 JSON 数组
- 现有 Key 默认值为 `["chat"]`，保持向后兼容
- 一个 Key 可同时属于多个类别（如 OpenAI Key 标记 `["chat", "embedding"]`）

### 查找逻辑变更

```
之前: getActiveApiKeysByProvider('openai')
之后: getActiveKeysByCategory('embedding') → 返回所有 categories 包含 'embedding' 的 Key
```

找不到匹配类别的 Key 时，对应模块静默跳过（不报错、不重复日志）。

---

## 改动清单

### 1. 数据库 — `apps/backend/src/db/schema.sql`

- `api_keys` 表新增 `categories TEXT NOT NULL DEFAULT '["chat"]'`
- 新增索引 `idx_api_keys_category`（考虑 JSON 查询，视 SQLite 版本决定是否建虚拟列）

### 2. 后端类型 — `apps/backend/src/modules/apikeys/types.ts`

```diff
export interface ApiKey {
  ...
+ categories: string[];
}

export interface CreateApiKeyInput {
  ...
+ categories?: string[];
}

export interface UpdateApiKeyInput {
  ...
+ categories?: string[];
}
```

### 3. 后端仓库 — `apps/backend/src/modules/apikeys/repository.ts`

- `createApiKey()` 写入 categories（默认 `["chat"]`）
- `updateApiKey()` 支持更新 categories
- `mapRow()` 解析 `JSON.parse(row.categories)`
- **新增** `getActiveKeysByCategory(category: string): ApiKey[]` — 遍历所有活跃 Key，过滤 categories 包含目标类别的

### 4. 后端路由 — `apps/backend/src/modules/apikeys/routes.ts`

- `POST /` 和 `PATCH /:id` 接受并校验 `categories` 字段
- `toPublicApiKey()` 脱敏返回中包含 categories

### 5. 嵌入模块 — `apps/backend/src/modules/memory/embedding.ts`

- `getApiKey()` 改为调用 `getActiveKeysByCategory('embedding')`
- 不止查 openai provider，所有 categories 包含 `embedding` 的 Key 都可用
- 返回空时不再报错，由上层静默处理

### 6. 记忆服务 — `apps/backend/src/modules/memory/service.ts`

- 构造函数中检测 embedding provider 可用性
- 不可用时设置 `this.longTermEnabled = false`
- `getContextForPrompt()` 和 `recordInteraction()` 中检查此标志，跳过长期记忆操作

### 7. LLM 路由 — `apps/backend/src/modules/llm/router.ts`

- `hasAvailableApiKey()` 和 `buildPreferredCandidates()` 中使用 `getActiveKeysByCategory('chat')` 过滤（向后兼容，因所有旧 Key 默认含 chat）

### 8. 前端类型 — `apps/frontend/src/types/index.ts`

```diff
export interface ApiKey {
  ...
+ categories: string[];
}

export interface CreateApiKeyInput {
  ...
+ categories?: string[];
}

export interface UpdateApiKeyInput {
  ...
+ categories?: string[];
}
```

### 9. 前端 API — `apps/frontend/src/api/apikeys.ts`

- `createApiKey()` 和 `updateApiKey()` 透传 `categories`

### 10. 前端页面 — `apps/frontend/src/pages/ApiKeys.tsx`

- 表格新增"类别"列，显示彩色 Tag 列表
- 新建/编辑 Modal 表单新增 `categories` 多选下拉框（Select mode="multiple"）
  - 选项: 对话补全/嵌入/多模态/代码
  - 默认选中 `["chat"]`
- Provider 选择联动：选 `openai` 时自动勾选 `chat + embedding`（可手动调整）

---

## 任务分解

### Task 1: 数据库 Schema 更新
- [ ] `schema.sql` 添加 `categories` 列
- [ ] 验证现有数据的向后兼容性

### Task 2: 后端 apikeys 模块改造
- [ ] `types.ts` 添加 categories 字段
- [ ] `repository.ts` 支持 categories 读写 + 新增按类别查询
- [ ] `routes.ts` 接受 categories 参数
- [ ] `concurrency.ts` 适配 categories（可选）

### Task 3: 嵌入与记忆模块适配
- [ ] `embedding.ts` 改用 categories 查找 Key + 无 Key 时静默返回
- [ ] `service.ts` 添加 longTermEnabled 标志，不可用时跳过长期记忆
- [ ] 仅在启动时输出一次警告日志

### Task 4: LLM 路由适配
- [ ] `router.ts` 使用 `getActiveKeysByCategory('chat')` 过滤候选模型

### Task 5: 前端适配
- [ ] `types/index.ts` 添加 categories
- [ ] `api/apikeys.ts` 透传 categories
- [ ] `pages/ApiKeys.tsx` 表单增加类别多选 + 表格增加类别列

### Task 6: 验证
- [ ] 无 embedding Key 时，长期记忆静默跳过，对话正常
- [ ] 添加含 embedding 类别的 Key 后，长期记忆自动启用
- [ ] 旧 Key 自动识别为 chat 类别，不影响现有功能
