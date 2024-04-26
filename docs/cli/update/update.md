---
description: 同步用户配置，更新导入的脚本
---
import APITable from '@site/src/components/APITable';

# 更新代码文件

```bash
arcadia update <args>
```

<APITable>

| 子命令 | 含义 | 描述 |
| :-: | :-: | -- |
| ` repo` | 更新代码仓库 | 更新所有位于 `repo` 目录下的代码仓库 |
| `raw` | 更新远程文件 | 更新所有位于 `raw` 目录下的远程文件 |
| `extra` | 执行自定义更新脚本 | 运行用户自定义的更新脚本 |

</APITable>

### 更新全部

```bash
arcadia update all
```
更新除指定仓库以外的所有内容

### 更新指定路径下的代码仓库

```bash
arcadia update <path>
```
`<path>` 仓库的相对路径或绝对路径，支持用 `.` 或 `./` 表示当前目录和用 `../` 表示上级目录

## 常见更新报错

- `ssh: connect to host gitee.com port XXX: Connection timed out`

  当前宿主机的 `XXX` 端口不可用所导致的网络连通性问题

- `Could not resolve hostname XXXX: Temporary failure in name resolution lost connection`

  字面意思，表示无法解析到该 `XXXX` 域名服务器，说明网络环境异常

- `Repository more than 5 connections`

  原因在于 `Gitee` 的服务器限制每秒最多同时连接 `5` 个客户端，此报错为正常现象稍后再次尝试即可
