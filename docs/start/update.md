---
title: 更新升级
---

如果你想了解如何更新导入的脚本，那么请前往查看 [CLI 文档](/docs/cli/update)

版本号格式为 `x.xx.xx`，其中第一位为主版本号，第二位为次版本号，第三位为修订版本号，更新修订版本无需重新部署直接更新项目源码即可，次版本根据更新日志的要求而定

## 镜像容器

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

更新位于 config 目录下的文件，最新的配置文件位于 sample 目录下，可通过后台管理面板的对比工具页进行可视化对比操作，不建议使用命令手动进行替换
