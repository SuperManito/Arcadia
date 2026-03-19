# Arcadia 源代码仓库 Copilot Instructions

适用范围：`backend/`、`shell/`、`utils/` 以及本仓库中与后端/CLI 直接相关的文件。

目标
- 让 AI 先理解后端和 CLI 的真实边界，再做最小、可验证的修改。
- 维持后端、CLI、数据库、接口文档之间的一致性。

项目概述
- 这是 Arcadia 的公共开源源代码仓库，主要提供后端服务与 CLI 能力。
- 项目主要使用 TypeScript、Node.js、Prisma 和 Shell 脚本协作实现。
- 后端代码通常位于 `backend/`，CLI 脚本位于 `shell/`，通用工具位于 `utils/`。

技术背景
- 后端依赖 Node.js、TypeScript、Express 相关生态和 Prisma 客户端。
- 数据存储使用 SQLite，schema 变更后通过 `npm run generate` 更新 Prisma Client。
- CLI 侧以 Shell 函数化模块组织，强调小函数、单一职责和可组合。

工作方式
- 优先读现有实现、相关配置和最近改动，再开始写代码。
- 修改时保持当前目录结构和命名风格，不要主动重排文件。
- 不要把前端当成本仓库的默认工作内容；若确实涉及前端联动，只说明接口契约，不主动改前端代码。
- 所有编辑文件必须使用 UTF-8 编码，无 BOM。

后端约束
- 后端主要是 TypeScript + Node.js + Prisma，接口实现位于 `backend/api/`。
- 数据库变更以 Prisma schema 为准，修改后运行 `npm run generate` 生成客户端文件，不要把 migrate 或 db push 作为默认流程。
- 新增或调整 API 时，要同时关注调用链、类型定义和错误处理。
- 变更完成后，优先补测试，再补文档。

CLI 约束
- `shell/` 里的脚本以函数式组织为主，保持模块化和可组合。
- 新增脚本要遵守现有命名和换行符要求，保持 LF。
- 不要把一次性逻辑随手塞进入口脚本，应该放到对应模块里。

常用命令
- 在 `backend/` 中运行 `npm run generate` 更新 Prisma Client。
- 在 `backend/` 中运行仓库既有脚本完成本地开发、检查和调试。
- 在 `shell/` 中新增脚本时，确保可执行权限和 LF 换行保持一致。

文档与接口同步
- 如果后端新增或修改接口，功能接近完成时必须同步更新项目级文档约定里要求的内部 API 文档和 `Arcadia Website` 的 `openapi.yaml`。
- 如果接口尚未稳定，不要提前写成正式契约；先标清草稿或待确认。

GitHub 在线 Copilot 友好内容
- 这个文件可以保留一定量的背景说明、目录概览和常用命令，帮助在线 Copilot 在只看到局部上下文时仍然判断仓库意图。
- 如果后续还要补充约束，优先补在这里，而不是把全局总纲写得过长。

完成检查
- 对于任何 edit/修改任务，在将任务标记为完成、准备提交或建议合并之前，必须先运行 `npm run lint:fix`，再运行 `npm run tsc`。
- `npm run lint:fix` 先做自动修复；如果还有 lint 问题，先修复再继续。
- `npm run tsc` 必须无 TypeScript 类型错误。
- 如果这次改动只涉及文档、提示词或命名修正，也可以按最小必要原则跳过额外验证，但不要删掉这条后端检查约束本身。
