# Arcadia - Copilot Instructions

## 项目概述

Arcadia 是一个一站式代码自动化运维平台，主要面向脚本语言编程与运维，支持定时任务调度。项目采用 TypeScript 全栈开发，后端使用 Node.js + Express + Prisma ORM，底层 CLI 使用 Shell 脚本实现。

支持的运行时环境：Node.js、tsx、ts-node、Deno、Bun、Python、Go、Rust、Lua、Ruby、Perl、C、Shell

## 技术栈

### 后端 (backend/)
- **运行时**: Node.js >= 18.0
- **语言**: TypeScript (ESNext)
- **Web 框架**: Express 5.x
- **ORM**: Prisma 6.x (SQLite)
- **实时通信**: Socket.IO
- **认证**: JWT (express-jwt)
- **代码执行**: tsx
- **进程管理**: PM2
- **日志**: log4js

### CLI (shell/)
- **语言**: Bash Shell
- **设计**: 模块化函数设计

## 项目结构

```
backend/           # 后端服务
├── api/           # API 路由处理
├── cmd/           # 命令行相关
├── config/        # 配置管理模块
├── cron/          # 定时任务引擎
├── db/            # 数据库连接
├── env/           # 环境变量处理
├── file/          # 文件操作
├── http/          # HTTP 相关工具
├── logger/        # 日志模块
├── message/       # 消息模块
├── prisma/        # Prisma Schema
├── server/        # Express 服务器
├── socket/        # WebSocket 服务
├── type/          # TypeScript 类型定义
├── utils/         # 工具函数
└── index.ts       # 入口

shell/             # CLI 脚本
├── main.sh        # 主入口脚本
├── arcadia.sh     # 项目命令入口
├── core/          # 核心模块
├── utils/         # 工具函数
├── run/           # run 子命令
├── stop/          # stop 子命令
├── list/          # list 子命令
├── repo/          # repo 子命令
├── ...            # 其他子命令模块
```

## 编码规范

### TypeScript (后端)

1. **代码风格**: 使用 @antfu/eslint-config 配置
2. **模块系统**: ESNext modules
3. **类型**: 优先使用接口定义，减少 `any` 使用
4. **函数设计**: 优先使用纯函数式设计，避免 Class 设计
5. **异步处理**: 使用 async/await

#### ESLint 规则特例
- 允许使用 `console`
- 允许短路表达式
- 关闭 import 排序规则
- 关闭箭头函数参数括号样式规则

### Shell (CLI)

1. **命名规范**:
   - 禁止使用小驼峰命名法
   - 函数名和内部变量使用下划线命名法
   - 跨作用域变量使用大驼峰命名法
   - 用户配置相关常量使用全大写

2. **变量声明**: 内部变量必须使用 `local` 声明

3. **模块化**:
   - 只有 `main.sh` 是命令主入口
   - 其它脚本只允许存在函数
   - 函数名不可使用 `main` 且需唯一
   - 使用 `import` 函数导入模块

4. **终端消息类型**:
   - `success` - 成功
   - `complete` - 完成
   - `warn` - 警告
   - `error` - 错误
   - `fail` - 失败
   - `tip` - 提示
   - `working` - 工作中

5. **换行符**: 使用 LF (`\n`)，不使用 CRLF

## 数据库设计

使用 Prisma ORM + SQLite，主要模型：
- `config` - 系统配置
- `envs` / `envsGroup` - 环境变量管理
- `tasks` / `taskCore` - 定时任务
- `message` - 消息通知

### 数据库自动同步

**重要**: 本项目使用 `prisma db push --accept-data-loss` 实现数据库 Schema 自动同步，服务启动时会自动执行。

- 修改 `backend/prisma/schema.prisma` 后无需手动操作数据库
- Schema 变更会在下次启动服务时自动应用
- `--accept-data-loss` 参数允许破坏性变更（如删除字段）自动执行
- **不要手动修改数据库结构**，所有变更都应通过 Schema 文件进行

## Git 提交规范

使用 Conventional Commits 规范 (@commitlint/config-conventional)：
- `feat:` - 新功能
- `fix:` - 修复
- `docs:` - 文档
- `style:` - 代码格式
- `refactor:` - 重构
- `test:` - 测试
- `chore:` - 构建/工具

## 常用命令

### 后端开发

```bash
cd backend
npm install                    # 安装依赖
npm run generate               # 生成 Prisma Client
npm run server                 # 启动开发服务器
npm run lint                   # 代码检查
npm run lint:fix               # 自动修复
npm run tsc                    # TypeScript 类型检查
```

### 生产环境

```bash
pm2 start ecosystem.config.js  # 使用 PM2 启动
```

## 注意事项

1. 本项目只涉及后端和底层 CLI，不涉及前端开发
2. `public/` 目录是前端构建产物，不需要修改
3. 新增 Shell 脚本需要赋予可执行权限并确保使用 LF 换行符
4. 配置存储在 SQLite 数据库中，路径为 `config/config.db`
