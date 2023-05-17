---
title: 更新升级
---

如果你想了解如何更新脚本以及仓库，那么请前往查看 [CLI 文档](/docs/cli/update)

## 镜像容器

:::danger 用户须知
以 **通知** 和 **更新要求** 为准，应及时使用最新版本镜像，重新部署 **无需删除** 所有配置
:::

### 删除容器

```bash
docker rm -f arcadia
```

### 删除镜像

```bash
docker rmi supermanito/arcadia
```

### 拉取新的镜像

```bash
docker pull supermanito/arcadia:latest
```

### 重新部署

部署项目 [点此跳转](/docs/install)

## 配置文件

### 主配置文件

:::tip
建议优先通过后台管理面板的 `编辑配置 - 对比工具` 进行可视化对比操作，不建议使用命令进行替换，太繁琐
:::

目标文件：`config/config.sh`

- #### 备份当前配置文件

  ```bash
  cp -f /arcadia/config/config.sh /arcadia/config/bak/config.sh
  ```

- #### 替换新版配置文件

  ```bash
  cp -f /arcadia/sample/config.sample.sh /arcadia/config/config.sh
  ```
  此操作为直接替换配置文件，建议优先使用后台管理面板的对比工具替代命令操作
