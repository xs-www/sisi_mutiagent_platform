# routes.ts

- 源文件：`apps/backend/src/modules/project/routes.ts`
- 文件职责：HTTP 路由层：解析请求、调用业务能力并构造响应。提供项目的创建/查询/更新/删除、成员管理、资源管理器打开目录，以及 AI 生成项目描述并推荐项目 Agent（`POST /generate-ai`，底层走 `chatWithPlatformModels` 自动选择平台可用模型）。
- 具名函数/方法：2 个

## 函数与方法

### `openInExplorer`（第 18 行）

- 类型：函数
- 签名：`function openInExplorer(targetPath: string): Promise<void>`
- 功能：实现 open in explorer 相关的业务逻辑。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `parseAiJson`（第 67 行）

- 类型：函数
- 签名：`function parseAiJson(content: string): any`
- 功能：将模型返回的文本解析为 JSON：先去除非必要的 markdown 代码块标记，再截取首个 `{` 与最后一个 `}` 之间的内容后 `JSON.parse`。
- 行为提示：解析失败时抛出异常，由 `POST /generate-ai` 的 catch 捕获并返回 500。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
