---
description: 添加代码仓库配置
---
import APITable from '@site/src/components/APITable';

# 添加代码仓库配置

```txt title="$ arcadia repo"
❖ Arcadia CLI - 导入代码仓库配置

  使用方法：

    arcadia repo <name> <url> <branch> [--options]

  命令选项：

    --enable             是否启用该配置
    --isPrivate          是否为私有仓库
    --authMethod         私有仓库认证方式，"ssh" 或 "http"
    --sshAlias           私有仓库 SSH 访问凭据配置 - 配置别名
    --sshHostName        私有仓库 SSH 访问凭据配置 - 主机地址
    --sshPrivateKeyPath  私有仓库 SSH 访问凭据配置 - 私钥文件路径
    --httpUsername       私有仓库 HTTP 访问凭据配置 - 用户名
    --httpPassword       私有仓库 HTTP 访问凭据配置 - 密码或令牌
    --updateTaskList     是否更新定时任务
    --scriptsPath        定时文件路径
    --scriptsType        定时文件格式，多个用 "|" 分开
    --whiteList          定时文件匹配白名单
    --blackList          定时文件匹配黑名单
    --autoDisable        是否自动禁用新的定时任务
    --addNotify          是否为新增定时任务推送通知提醒
    --delNotify          是否为过期定时任务推送通知提醒
    --help               查看此命令帮助

  命令帮助：

    <name> 配置名称  <url> 链接地址  <branch> 分支名称  [--options] 命令选项
```

必须提供配置名称、链接地址、分支名称，命令选项后需跟选项值

## 命令选项 

<APITable>

| 名称 | 描述 | 值 |
| :-: | :-: | :-: |
| `--enable` | 是否启用该配置，不提供默认为 `true` | `true` 或 `false` |
| `--isPrivate` | 是否为私有仓库，不提供默认为 `false` | `true` 或 `false` |
| `--authMethod` | 私有仓库认证方式 | `ssh` 或 `http` |
| `--sshAlias` | 私有仓库 SSH 访问凭据配置 - 配置别名 | 详见 [_authsettings_](/docs/configuration/import/repo/config/#authsettings) |
| `--sshHostName` | 私有仓库 SSH 访问凭据配置 - 主机地址 | 详见 [_authsettings_](/docs/configuration/import/repo/config/#authsettings) |
| `--sshPrivateKeyPath` | 私有仓库 SSH 访问凭据配置 - 私钥文件路径 | 详见 [_authsettings_](/docs/configuration/import/repo/config/#authsettings) |
| `--httpUsername` | 私有仓库 HTTP 访问凭据配置 - 用户名 | 详见 [_authsettings_](/docs/configuration/import/repo/config/#authsettings) |
| `--httpPassword` | 私有仓库 HTTP 访问凭据配置 - 密码或令牌 | 详见 [_authsettings_](/docs/configuration/import/repo/config/#authsettings) |
| `--updateTaskList` | 是否为该配置涉及到的代码文件启用定时任务，不提供默认为 `false` | `true` 或 `false` |
| `--scriptsPath` | 定时文件路径 | 详见 [_cronsettings_](/docs/configuration/import/repo/config/#cronsettings) |
| `--scriptsType` | 定时文件格式 | 详见 [_cronsettings_](/docs/configuration/import/repo/config/#cronsettings)，多个用 `\|` 进行分割，例如 `js\|py\|ts` |
| `--whiteList` | 定时文件匹配白名单 | 详见 [_cronsettings_](/docs/configuration/import/repo/config/#cronsettings) |
| `--blackList` | 定时文件匹配黑名单 | 详见 [_cronsettings_](/docs/configuration/import/repo/config/#cronsettings) |
| `--autoDisable` | 是否自动禁用新增定时任务，不提供默认为 `false` | `true` 或 `false` |
| `--addNotify` | 是否为新增定时任务推送通知提醒，不提供默认为 `true` | `true` 或 `false` |
| `--delNotify` | 是否为过期定时任务推送通知提醒，不提供默认为 `true` | `true` 或 `false` |
| `--help` | 获取命令帮助 | 无 |

</APITable>

:::info 当选项值包含 `空格` 以及 `;` `&` 等特殊字符时，需用英文引号包裹选项值以避免传递错误
:::

```bash showLineNumbers title="命令示例"
arcadia repo \
  "测试仓库" \
  "https://github.com/User/Repo.git" \
  main \
  --enable true \
  --updateTaskList true \
  --scriptsType 'js|py' \
  --whiteList '^test_'
```
