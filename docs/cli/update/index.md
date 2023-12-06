---
title: update
description: 更新相关命令
---
import APITable from '@site/src/components/APITable';

```
❖ 更新指令

  使用方法：

    update all        ✧ 更新全部内容，包括下列除指定仓库以外的所有内容
    update source     ✧ 更新项目源码，包括项目源码，所有仓库和脚本，自定义脚本等
    update repo       ✧ 更新脚本仓库，包括项目源码，所有仓库和脚本，自定义脚本等
    update raw        ✧ 更新远程脚本，包括项目源码，所有仓库和脚本，自定义脚本等
    update extra      ✧ 执行自定义更新脚本，包括项目源码，所有仓库和脚本，自定义脚本等
    update <path>     ✧ 更新指定路径下的脚本仓库，包括项目源码，所有仓库和脚本，自定义脚本等

  命令注释：

    <path> 相对路径或绝对路径
```

## 更新全部

```bash
update all
```

项目默认配置了该命令的定时任务

关于常见报错

- `Repository more than 5 connections`

    原因在于 `Gitee` 的服务器限制每秒最多同时连接 `5` 个客户端，此报错为正常现象稍后再次尝试即可

- `ssh: connect to host gitee.com port XXX: Connection timed out`

    当前宿主机的 `XXX` 端口不可用所导致的网络连通性问题

- `Could not resolve hostname XXXX: Temporary failure in name resolution lost connection`

    字面意思，表示无法解析到该 `XXXX` 域名服务器，说明网络环境异常

## 单独更新

由于更新全部内容执行时间可能稍长，为了方便使用已划分开各部分的内容，可单独对其进行更新
```bash
update <args/path>
```

<APITable>

|    命令    |       含义      |                   描述                               |
| :-------: | :-------------: | --------------------------------------------------- |
|  `source` |     项目源码     | 一般情况下通过此操作更新项目，如有新的镜像则可能需要重新部署 |
|  ` repo`  |     所有仓库     | 更新所有位于 repo 目录下由用户添加的脚本仓库              |
|   `raw`   |     远程脚本     | 更新所有位于 raw 目录下由用户添加的远程脚本               |
|  `extra`  |   自定义更新脚本  | 运行用户定义的额外 Shell 脚本                           |
|  `<path>` |  指定路径下的仓库 | 这里需要自行输入内容，具体为目标仓库的相对路径或绝对路径     |

</APITable>

`<path>` 支持用 `.` 或 `./` 表示当前目录和用 `../` 表示上级目录
ㅤ