# ToolConfig.tsx

- 源文件：`apps/frontend/src/pages/ToolConfig.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：10 个

## 函数与方法

### `ToolConfig`（第 49 行）

- 类型：React 组件
- 签名：`export default function ToolConfig()`
- 功能：渲染 ToolConfig 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；更新界面或运行时状态；可能抛出异常。

### `handleApprovalToggle`（第 72 行）

- 类型：箭头函数
- 签名：`async handleApprovalToggle(tool: ToolDefinition, checked: boolean)`
- 功能：处理 approval toggle 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleCreateTool`（第 84 行）

- 类型：箭头函数
- 签名：`async handleCreateTool()`
- 功能：处理 create tool 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态；可能抛出异常。

### `handleDeleteTool`（第 113 行）

- 类型：箭头函数
- 签名：`async handleDeleteTool(tool: ToolDefinition)`
- 功能：处理 delete tool 事件并更新相关状态。
- 行为提示：包含异步操作。

### `render`（第 129 行）

- 类型：箭头函数
- 签名：`render(name: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 142 行）

- 类型：箭头函数
- 签名：`render(category: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 151 行）

- 类型：箭头函数
- 签名：`render(params: ToolDefinition['params'])`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 167 行）

- 类型：箭头函数
- 签名：`render(required: boolean, record: ToolDefinition)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 179 行）

- 类型：箭头函数
- 签名：`render(_: any, record: ToolDefinition)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 189 行）

- 类型：箭头函数
- 签名：`render(_: any, record: ToolDefinition)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
