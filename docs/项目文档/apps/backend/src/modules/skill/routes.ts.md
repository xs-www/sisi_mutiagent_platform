# routes.ts

- 源文件：`apps/backend/src/modules/skill/routes.ts`
- 文件职责：HTTP 路由层：解析请求、调用业务能力并构造响应。提供 Skill 包的列表/详情/下载/导入/更新/删除接口，导入时仅接受 .zip 技能包并预检验 SKILL.md。
- 具名函数/方法：2 个

## 函数与方法

### `sanitizeFileBaseName`（第 21 行）

- 类型：函数
- 签名：`function sanitizeFileBaseName(name: string): string`
- 功能：实现 sanitize file base name 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `buildSkillFileMetadata`（第 29 行）

- 类型：函数
- 签名：`function buildSkillFileMetadata(fileName: string, buffer: Buffer): Pick<CreateSkillPackInput, 'id' | 'fileName' | 'filePath' | 'fileExt' | 'fileSize' | 'importSource'> & { skillName: string; skillDescription: string }`
- 功能：仅接受 `.zip` 技能包；调用 `inspectSkillPackage` 预检验包内是否包含 SKILL.md（缺失时抛 `SkillValidationError`），并解析出技能名称与描述；随后将文件落盘并返回元数据。
- 行为提示：访问文件系统；可能抛出 `SkillValidationError`（映射为 400）或其它异常。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
