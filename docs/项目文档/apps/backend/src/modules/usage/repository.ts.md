# repository.ts

- 源文件：`apps/backend/src/modules/usage/repository.ts`
- 文件职责：数据仓储层：封装 token 用量的写入与聚合查询。
- 具名函数/方法：3 个

## 函数与方法

### `recordTokenUsage`（第 6 行）

- 类型：函数
- 签名：`export function recordTokenUsage(input: RecordTokenUsageInput): void`
- 功能：向 `token_usage` 表插入一行用量明细，`total_tokens` 由四项相加得出。
- 行为提示：读写数据库。
- 边缘条件：`project_id` / `ticket_id` / `agent_id` 可空（NULL 表示平台级消耗）；各 token 字段缺省按 0。写库异常由调用方捕获（`chatWithPlatformModels` 中仅记日志）。

### `getProjectUsageSummary`（第 31 行）

- 类型：函数
- 签名：`export function getProjectUsageSummary(projectId: string): ProjectUsageSummary`
- 功能：聚合单个项目的调用次数与各 token 维度累计值。
- 行为提示：读写数据库。
- 边缘条件：无记录时返回全 0 的聚合结果（SUM/COUNT 均以 0 兜底）。

### `getAllProjectsUsageSummary`（第 55 行）

- 类型：函数
- 签名：`export function getAllProjectsUsageSummary(): ProjectUsageSummary[]`
- 功能：按项目分组聚合全平台用量，LEFT JOIN `projects` 补充项目名，按合计 token 降序返回。
- 行为提示：读写数据库。
- 边缘条件：未关联项目的记录 `projectName` 为空；无任何记录时返回空数组。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
