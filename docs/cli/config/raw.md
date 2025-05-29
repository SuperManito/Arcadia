---
description: 添加远程文件配置
---
import APITable from '@site/src/components/APITable';

# 添加远程文件配置

```bash
arcadia raw <name> <url> [--options]
```

必须提供配置名称、链接地址，命令选项后面需要跟选项值

## 命令选项 

<APITable>

| 名称 | 描述 |
| :-: | --- |
| `--enable` | 是否启用该配置 |
| `--updateTaskList` | 是否为该配置涉及到的代码文件启用定时任务 |
| `--help` | 获取命令帮助 |

</APITable>
