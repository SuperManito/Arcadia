---
title: 主要配置
---

本篇介绍在主要配置文件中一些项目功能的配置项

:::note 后台管理面板入口
编辑配置 - 下拉选择 `config.sh`
:::

:::info 关于主要配置文件中的内容
`config.sh` 主要用来存储用户的配置信息（变量），由于需要经常调用所以不适合存放任何实际执行的命令
:::

## 自定义更新脚本

在每次执行完内置更新命令后运行的 Shell 脚本，用于用户自定义一些更新命令

如若使用必须将脚本命名为 `extra.sh` 并且放置在 **config** 配置文件目录下

```bash title="config.sh"
## ❖ 2. 自定义 Extra 脚本功能
# 在每次执行更新脚本时额外运行的 Shell 脚本
# 必须将脚本命名为 "extra.sh" 并且放置在 config 目录下
# 如想启用请赋值为 "true"
EnableExtraShell=""
# 定义 Extra 自定义脚本远程同步功能：
#   1). 功能开关，如想启用请赋值为 "true"
EnableExtraShellSync=""
#   2). 同步地址
ExtraShellSyncUrl=""
```
