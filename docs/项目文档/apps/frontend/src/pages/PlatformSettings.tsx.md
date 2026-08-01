# PlatformSettings.tsx

- 源文件：`apps/frontend/src/pages/PlatformSettings.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：12 个

## 函数与方法

### `PlatformSettings`（第 55 行）

- 类型：React 组件
- 签名：`export default function PlatformSettings()`
- 功能：渲染 PlatformSettings 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleCreate`（第 99 行）

- 类型：箭头函数
- 签名：`handleCreate()`
- 功能：处理 create 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleEdit`（第 106 行）

- 类型：箭头函数
- 签名：`handleEdit(record: PlatformModel)`
- 功能：处理 edit 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleSave`（第 117 行）

- 类型：箭头函数
- 签名：`async handleSave()`
- 功能：处理 save 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleDelete`（第 150 行）

- 类型：箭头函数
- 签名：`async handleDelete(id: string)`
- 功能：处理 delete 事件并更新相关状态。
- 行为提示：包含异步操作。

### `handleToggleActive`（第 160 行）

- 类型：箭头函数
- 签名：`async handleToggleActive(record: PlatformModel, checked: boolean)`
- 功能：处理 toggle active 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `render`（第 179 行）

- 类型：箭头函数
- 签名：`render(p: number)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 186 行）

- 类型：箭头函数
- 签名：`render(provider: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 196 行）

- 类型：箭头函数
- 签名：`render(name: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 203 行）

- 类型：箭头函数
- 签名：`render(active: boolean, record: PlatformModel)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 216 行）

- 类型：箭头函数
- 签名：`render(t: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 222 行）

- 类型：箭头函数
- 签名：`render(_: any, record: PlatformModel)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
