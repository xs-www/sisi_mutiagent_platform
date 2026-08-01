# SkillPacks.tsx

- 源文件：`apps/frontend/src/pages/SkillPacks.tsx`
- 文件职责：前端页面：组合数据请求、状态与用户交互界面。
- 具名函数/方法：15 个

## 函数与方法

### `formatBytes`（第 45 行）

- 类型：函数
- 签名：`function formatBytes(size: number): string`
- 功能：构建或格式化 bytes。
- 行为提示：未识别到显著的外部副作用。

### `SkillPacks`（第 51 行）

- 类型：React 组件
- 签名：`export default function SkillPacks()`
- 功能：渲染 SkillPacks 页面或界面组件，并协调其数据加载与交互状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleEdit`（第 81 行）

- 类型：箭头函数
- 签名：`handleEdit(record: SkillPack)`
- 功能：处理 edit 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleSaveEdit`（第 92 行）

- 类型：箭头函数
- 签名：`async handleSaveEdit()`
- 功能：处理 save edit 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleDelete`（第 118 行）

- 类型：箭头函数
- 签名：`async handleDelete(id: string)`
- 功能：处理 delete 事件并更新相关状态。
- 行为提示：包含异步操作。

### `handleToggleActive`（第 128 行）

- 类型：箭头函数
- 签名：`async handleToggleActive(record: SkillPack, checked: boolean)`
- 功能：处理 toggle active 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `handleViewDetail`（第 137 行）

- 类型：箭头函数
- 签名：`handleViewDetail(record: SkillPack)`
- 功能：处理 view detail 事件并更新相关状态。
- 行为提示：更新界面或运行时状态。

### `handleImportFile`（第 142 行）

- 类型：箭头函数
- 签名：`async handleImportFile()`
- 功能：处理 import file 事件并更新相关状态。
- 行为提示：包含异步操作；更新界面或运行时状态。

### `render`（第 183 行）

- 类型：箭头函数
- 签名：`render(text: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 190 行）

- 类型：箭头函数
- 签名：`render(cat: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 196 行）

- 类型：箭头函数
- 签名：`render(_: any, record: SkillPack)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 210 行）

- 类型：箭头函数
- 签名：`render(desc: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 217 行）

- 类型：箭头函数
- 签名：`render(active: boolean, record: SkillPack)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 226 行）

- 类型：箭头函数
- 签名：`render(t: string)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

### `render`（第 232 行）

- 类型：箭头函数
- 签名：`render(_: any, record: SkillPack)`
- 功能：构建或格式化 render。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
