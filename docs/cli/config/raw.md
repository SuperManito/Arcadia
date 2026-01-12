---
description: 添加代码文件配置
---
import APITable from '@site/src/components/APITable';

# 添加代码文件配置

```txt title="$ arcadia raw"
❖ Arcadia CLI - 导入代码文件配置

  使用方法：

    arcadia raw <name> <url> [--options]

  命令选项：

    --enable             是否启用该配置
    --updateTaskList     是否更新定时任务
    --help               查看此命令帮助

  命令帮助：

    <name> 配置名称  <url> 链接地址  [--options] 命令选项
```

必须提供配置名称、链接地址，命令选项后需跟选项值

## 命令选项 

<APITable>

| 名称 | 描述 | 值 |
| :-: | :-: | :-: |
| `--enable` | 是否启用该配置，不提供默认为 `true` | `true` 或 `false` |
| `--updateTaskList` | 是否为该配置涉及到的代码文件启用定时任务，不提供默认为 `false` | `true` 或 `false` |
| `--help` | 获取命令帮助 | 无 |

</APITable>

```bash showLineNumbers title="命令示例"
arcadia raw \
  "测试文件" \
  "https://raw.githubusercontent.com/User/Repo/refs/heads/main/example.js" \
  --enable true \
  --updateTaskList true
```
