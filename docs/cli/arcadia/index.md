---
title: arcadia
---

```
❖ 核心指令

  命令帮助：

    arcadia repo <name> <url> <branch> [--options]   ✧ 导入脚本仓库配置，其它配置项通过命令选项控制，具体详见 arcadia repo 命令帮助
    arcadia raw <name> <url> [--options]             ✧ 导入远程脚本配置，其它配置项通过命令选项控制，具体详见 arcadia raw 命令帮助

    arcadia service <args>                           ✧ 后台管理面板和网页终端功能控制，开启或重启 start，关闭 stop，登录信息 info，重置密码 respwd
    arcadia tgbot <args>                             ✧ 电报机器人功能控制，启动或重启 start，停止 stop，查看日志 logs，更新升级 update
    arcadia server status                            ✧ 查看各服务的详细信息，包括运行状态，创建时间，处理器占用，内存占用，运行时长

    arcadia env <args>                               ✧ 处理运行脚本依赖相关命令，安装 install，修复 repairs
    arcadia check config                             ✧ 检查项目相关配置文件完整性，如果缺失就从模板导入

  命令注释：

    <args> 子命令  <name> 配置名称  <url> 链接地址  <branch> 分支名称  [--options] 命令选项
```

import DocCardList from '@theme/DocCardList';

<DocCardList />
