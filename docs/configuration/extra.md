---
title: 自定义脚本
---

# 自定义脚本
作用：在每次执行更新脚本命令时额外运行的 Shell 脚本

如若使用必须将脚本命名为 `extra.sh` 并且放置在 **config** 配置文件目录下  
在 **sample** 目录下存在此脚本的模版，脚本内容为用于拉取第三方仓库中的脚本

:::info 后台管理面板入口
编辑配置 - 下拉选择 `config.sh`
:::

- 编辑 **config.sh** 配置文件中的变量

    ```bash
    ## ❖ 5. 自定义 Extra 脚本功能
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
