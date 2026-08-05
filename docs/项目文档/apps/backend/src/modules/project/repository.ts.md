# repository.ts

- 源文件：`apps/backend/src/modules/project/repository.ts`
- 文件职责：数据仓储层：封装持久化数据的查询和变更操作。
- 具名函数/方法：30 个

## 函数与方法

### `normalizePath`（第 19 行）

- 类型：函数
- 签名：`function normalizePath(pathValue: string): string`
- 功能：将 normalize path 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `isPathInside`（第 23 行）

- 类型：函数
- 签名：`function isPathInside(parentDir: string, candidatePath: string): boolean`
- 功能：检查 path inside 是否满足约束。
- 行为提示：未识别到显著的外部副作用。

### `ensureGitInit`（第 30 行）

- 类型：函数
- 签名：`function ensureGitInit(workspacePath: string): void`
- 功能：若工作空间尚无 `.git`，执行 `git init` 使其成为 git 仓库，保证 `git_operation` 工具可用。
- 行为提示：访问文件系统；执行外部命令。
- 边缘条件：已存在 `.git` 时跳过；`git init` 失败仅告警，不阻塞项目创建。

### `ensureProjectDirScaffold`（第 46 行）

- 类型：函数
- 签名：`function ensureProjectDirScaffold(projectDir: string): void`
- 功能：创建项目目录骨架（workspace/agents/tickets），并对 workspace 执行 `git init`。
- 行为提示：访问文件系统。
- 本次改动：新增调用 `ensureGitInit(workspacePath)`。启动时 `migrateProjectStorageDirsToNameBased` 会遍历所有已有项目调用本函数，因此既有项目的 workspace 也能自动补齐 `.git`。

### `sanitizeName`（第 35 行）

- 类型：函数
- 签名：`function sanitizeName(name: string): string`
- 功能：实现 sanitize name 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `buildUniqueProjectDirByName`（第 46 行）

- 类型：函数
- 签名：`function buildUniqueProjectDirByName(projectName: string, currentDirPath?: string): string`
- 功能：构建或格式化 unique project dir by name。
- 行为提示：未识别到显著的外部副作用。

### `resolveProjectDirFromRecord`（第 61 行）

- 类型：函数
- 签名：`function resolveProjectDirFromRecord(project: Project): string`
- 功能：实现 resolve project dir from record 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `getProjectDir`（第 75 行）

- 类型：函数
- 签名：`function getProjectDir(projectId: string): string`
- 功能：读取或查询 project dir 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getProjectMetaPath`（第 83 行）

- 类型：函数
- 签名：`function getProjectMetaPath(projectId: string): string`
- 功能：读取或查询 project meta path 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `writeJsonFile`（第 87 行）

- 类型：函数
- 签名：`function writeJsonFile(filePath: string, data: unknown): void`
- 功能：更新并保存 json file 状态或数据。
- 行为提示：访问文件系统。

### `persistProjectDocument`（第 91 行）

- 类型：函数
- 签名：`function persistProjectDocument(project: Project): void`
- 功能：更新并保存 project document 状态或数据。
- 行为提示：访问文件系统。

### `getProjectStorageDir`（第 101 行）

- 类型：函数
- 签名：`export function getProjectStorageDir(projectId: string): string`
- 功能：读取或查询 project storage dir 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `getProjectTicketsDir`（第 105 行）

- 类型：函数
- 签名：`export function getProjectTicketsDir(projectId: string): string`
- 功能：读取或查询 project tickets dir 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `buildProjectWorkspaceDigest`（第 109 行）

- 类型：函数
- 签名：`export function buildProjectWorkspaceDigest(projectId: string, maxEntries = 120): string`
- 功能：构建或格式化 project workspace digest。
- 行为提示：访问文件系统。

### `walk`（第 124 行）

- 类型：箭头函数
- 签名：`walk(dirPath: string, depth: number): void`
- 功能：实现 walk 相关的业务逻辑。
- 行为提示：访问文件系统。

### `migrateProjectStorageDirsToNameBased`（第 165 行）

- 类型：函数
- 签名：`export function migrateProjectStorageDirsToNameBased(): void`
- 功能：实现 migrate project storage dirs to name based 相关的业务逻辑。
- 行为提示：读写数据库。

### `createProject`（第 199 行）

- 类型：函数
- 签名：`export function createProject(input: CreateProjectInput): Project`
- 功能：创建项目。未指定 supervisorId 时默认为 `supervisor`（监理 agent）；所有内置 Agent 自动加入项目成员。
- 行为提示：读写数据库；访问文件系统。

### `getProjectById`（第 223 行）

- 类型：函数
- 签名：`export function getProjectById(id: string): Project | null`
- 功能：读取或查询 project by id 数据并返回结果。
- 行为提示：读写数据库。

### `getAllProjects`（第 230 行）

- 类型：函数
- 签名：`export function getAllProjects(): Project[]`
- 功能：读取或查询 all projects 数据并返回结果。
- 行为提示：读写数据库。

### `updateProject`（第 236 行）

- 类型：函数
- 签名：`export function updateProject(id: string, input: UpdateProjectInput): Project | null`
- 功能：更新并保存 project 状态或数据。
- 行为提示：读写数据库。

### `deleteProject`（第 277 行）

- 类型：函数
- 签名：`export function deleteProject(id: string): boolean`
- 功能：删除或清理 project 相关资源。
- 行为提示：读写数据库。

### `addProjectMember`（第 308 行）

- 类型：函数
- 签名：`export function addProjectMember(projectId: string, agentId: string): ProjectMember`
- 功能：创建或注册 project member 数据。
- 行为提示：读写数据库。

### `removeProjectMember`（第 325 行）

- 类型：函数
- 签名：`export function removeProjectMember(projectId: string, agentId: string): boolean`
- 功能：删除或清理 project member 相关资源。
- 行为提示：读写数据库。

### `getProjectMember`（第 337 行）

- 类型：函数
- 签名：`export function getProjectMember(projectId: string, agentId: string): ProjectMember | null`
- 功能：读取或查询 project member 数据并返回结果。
- 行为提示：读写数据库。

### `getProjectMembers`（第 344 行）

- 类型：函数
- 签名：`export function getProjectMembers(projectId: string): ProjectMember[]`
- 功能：读取或查询 project members 数据并返回结果。
- 行为提示：读写数据库。

### `getProjectMemberProfiles`（第 350 行）

- 类型：函数
- 签名：`export function getProjectMemberProfiles(projectId: string): ProjectMemberProfile[]`
- 功能：读取或查询 project member profiles 数据并返回结果。
- 行为提示：未识别到显著的外部副作用。

### `resolveProjectAssignee`（第 364 行）

- 类型：函数
- 签名：`export function resolveProjectAssignee(projectId: string, assigneeHint?: string): ProjectMemberProfile | null`
- 功能：实现 resolve project assignee 相关的业务逻辑。
- 行为提示：未识别到显著的外部副作用。

### `getAgentProjects`（第 394 行）

- 类型：函数
- 签名：`export function getAgentProjects(agentId: string): Project[]`
- 功能：读取或查询 agent projects 数据并返回结果。
- 行为提示：读写数据库。

### `mapRowToProject`（第 405 行）

- 类型：函数
- 签名：`function mapRowToProject(row: any): Project`
- 功能：将 map row to project 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

### `mapRowToMember`（第 418 行）

- 类型：函数
- 签名：`function mapRowToMember(row: any): ProjectMember`
- 功能：将 map row to member 涉及的数据转换为目标结构。
- 行为提示：未识别到显著的外部副作用。

---

> 本页由源码静态分析生成；行号以生成时版本为准。匿名内联回调归入其所属具名函数，不单独建条目。
