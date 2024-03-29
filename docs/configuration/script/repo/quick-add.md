---
title: 快速添加
---
import APITable from '@site/src/components/APITable';

# 通过命令行快速添加

```bash
arcadia repo <name> <url> <branch> [--options]
```

必须提供配置名称、链接地址、分支名称，命令选项后面需要跟选项值

## 命令选项 

<APITable>

| 名称 | 描述 |
| :-: | --- |
| `--updateTaskList` | 是否为该配置启用定时任务 |
| `--scriptsPath` | 定时脚本路径 |
| `--scriptsType` | 定时脚本文件格式 |
| `--whiteList` | 定时脚本匹配白名单 |
| `--blackList` | 定时脚本匹配黑名单 |
| `--autoDisable` | 是否自动禁用新的定时任务 |
| `--addNotify` | 是否为新增定时任务推送通知提醒 |
| `--delNotify` | 是否为过期定时任务推送通知提醒 |
| `--help` | 获取命令帮助 |

</APITable>
