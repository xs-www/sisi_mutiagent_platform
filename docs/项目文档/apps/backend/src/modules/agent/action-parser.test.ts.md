# action-parser.test.ts

- 源文件：`apps/backend/src/modules/agent/action-parser.test.ts`
- 文件职责：测试文件：验证相邻模块的核心行为与边界情况。本次新增 invalid 解析用例：空响应、无 Action 行、无法识别的 Action、空工具名 `tool_call()` 均解析为 `invalid`（而非 `finish`），防止"空操作=完成"的假完成。
- 具名函数/方法：0 个

## 函数与方法

本文件没有具名函数或方法。匿名回调、类型声明和常量不单独列项。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
