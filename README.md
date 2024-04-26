# 文档

文档引擎使用 [Docusaurus 3](https://docusaurus.io/zh-CN) 进行构建

### 安装

```bash
pnpm i
```

### 本地预览

```bash
pnpm run start
```

### 构建

```bash
pnpm run build
```

### 部署

- PowerShell

  ```bash
  cmd /C 'set "GIT_USER=<用户名>" && pnpm run deploy'
  ```

- bash

  ```bash
  GIT_USER=<用户名> && pnpm run deploy
  ```
