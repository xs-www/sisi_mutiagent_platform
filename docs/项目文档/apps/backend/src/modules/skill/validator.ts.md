# validator.ts

- 源文件：`apps/backend/src/modules/skill/validator.ts`
- 文件职责：技能包预检验：校验上传的 .zip 技能包是否为有效压缩包、是否包含 SKILL.md，并从 SKILL.md 的 YAML frontmatter 中读取技能名称与描述。
- 具名函数/方法：4 个

## 函数与方法

### `isZipBuffer`（第 19 行）

- 类型：函数
- 签名：`function isZipBuffer(buffer: Buffer): boolean`
- 功能：通过文件头魔数（`PK`，0x50 0x4B）判断缓冲区是否为 zip 压缩包。
- 行为提示：未识别到显著的外部副作用。

### `findSkillMdEntry`（第 25 行）

- 类型：函数
- 签名：`function findSkillMdEntry(buffer: Buffer): { entryName: string; content: string } | null`
- 功能：在压缩包内查找层级最浅的 `SKILL.md`（文件名大小写不敏感），返回其条目路径与文本内容；未找到返回 `null`。
- 行为提示：
  - 压缩包无效时抛 `SkillValidationError`（消息：技能包格式错误：不是有效的 zip 压缩包）；
  - 读取条目内容失败时抛 `SkillValidationError`。

### `parseSkillMdMeta`（第 54 行）

- 类型：函数
- 签名：`export function parseSkillMdMeta(content: string): { name?: string; description?: string }`
- 功能：解析 SKILL.md 开头 `---` 包裹的 YAML frontmatter，提取 `name` 与 `description` 字段（去除首尾空白，空值不返回）。
- 行为提示：
  - 无 `---` 定界符或缺少第二个定界符时返回 `{}`；
  - frontmatter YAML 解析失败时返回 `{}`；
  - `name`/`description` 为非字符串时忽略。

### `inspectSkillPackage`（第 84 行）

- 类型：函数
- 签名：`export function inspectSkillPackage(buffer: Buffer): SkillPackageInfo`
- 功能：技能包预检验入口：非 zip 数据或包内缺少 SKILL.md 时抛 `SkillValidationError`，通过后返回 SKILL.md 内容与解析出的名称/描述。
- 行为提示：
  - 非 zip 数据：抛 `SkillValidationError`（消息：技能包格式错误：仅支持 .zip 压缩包）；
  - 包内无 SKILL.md：抛 `SkillValidationError`（消息：技能包不符合规范：包内缺少 SKILL.md 文件，禁止上传）；
  - 名称/描述缺失时返回空字符串（调用方回退到表单或文件名）。

## 全局常量 / 变量

- `SKILL_MD_NAME`（第 6 行）：`string`，固定值 `skill.md`，用于大小写不敏感匹配。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
