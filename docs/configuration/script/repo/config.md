---
title: 配置文件
---
import APITable from '@site/src/components/APITable';

本篇介绍配置仓库的方法以及一些相关的配置项

你可以在后台管理面板点击 `编辑配置` - `下拉选择 sync.yml` 来在线编辑

## 主要配置项

<APITable>

| 名称 | 必填 | 类型 | 默认值 | 描述 |
| :-: | :-: | :-: | :-: | --- |
| `name` | 是 | `string` | 无 | 仓库名称 |
| `url` | 是 | `string` | 无 | 仓库远程地址 |
| `branch` | 是 | `string` | 无 | 分支名称 |
| `enable` | 否 | `boolean` | `true` | 是否启用该仓库配置 |
| `cronSettings` | 否 | `object` | 无 | 定时任务设置，详见下方 |

</APITable>

### 定时任务配置项

<APITable>

| 名称 | 必填 | 类型 | 默认值 | 描述 |
| :-: | :-: | :-: | :-: | --- |
| `updateTaskList` | 否 | `boolean` | `false` | 是否为该配置启用定时任务（默认不启用） |
| `scriptsPath` | 否 | `string` | 无 | 定时脚本路径（默认为仓库根目录） |
| `scriptsType` | 否 | `array` | `["js", "py", "ts"]` | 定时脚本文件格式（默认为三种类型的脚本） |
| `whiteList` | 否 | `string` | 无 | 定时脚本匹配白名单（默认为空，即所有脚本） |
| `blackList` | 否 | `string` | 无 | 定时脚本匹配黑名单（默认为空） |
| `autoDisable` | 否 | `boolean` | `false` | 是否自动禁用新的定时任务（默认不禁用） |
| `addNotify` | 否 | `boolean` | `true` | 是否为新增定时任务推送通知提醒 |
| `delNotify` | 否 | `boolean` | `true` | 是否为过期定时任务推送通知提醒 |

</APITable>

- #### `scriptsPath`

  根据导入工作原理，匹配文件不会递归仓库下的所有目录，不设置该项或键值为空即代表默认根目录  
  如果你想配置匹配指定目录下的文件则需要手动配置，多个路径需要使用空格来进行分割，仓库根目录用 `/` 来表示
  ```yaml title="示例"
  scriptsPath: "/ test"
  ```
  如上，最终会匹配位于仓库根目录和 `test` 子目录下的所有文件即 `/arcadia/repo/<repo_dir>/*` 和  `/arcadia/repo/<repo_dir>/test/*`

- #### `scriptsType`

  你需要通过数组的形式进行配置，键名为脚本后缀格式名称，默认（不填）为 JavaScript、Python、TypeScript 脚本

  ```yaml title="示例"
  scriptsType:
    - js
    - py
    - ts
  ```
  工作原理是在读取该项配置时会使用 `join()` 方法将数组合并成一个用空格进行分割的字符串 `js py ts`，之后会通过遍历数组的方式转变成基于 [**grep**](https://www.runoob.com/linux/linux-comm-grep.html) 指令过滤规则的最终形态字符串 `\.js$|\.py$|\.ts$`

- #### `whiteList` 或 `blackList`

  :::primary
    如果你启用了定时脚本配置那么请尽可能不要忽略此配置项，因为如果不配置该项可能会导致自动添加一些无用的定时任务
  :::

  基于 [**grep**](https://www.runoob.com/linux/linux-comm-grep.html) 指令进行过滤（默认使用 `-E` 命令选项用于匹配多个表达式），支持正则表达式。如果要匹配多个表达式，那么根据该指令规范你需要使用 `|` 字符来进行分割，你可以先在本地调试好再进行配置，例如 `ls | grep -E "<xxx>"`。如果你想学习正则表达式和该指令你可以看看 [《基础正则表达式》](https://www.junmajinlong.com/shell/regex_basic) 这篇文章

  :::note 为什么需要使用单引号包裹键值？
  根据 YAML 语法规范，如果使用双引号来包裹键值那么会使转义字符生效，这样在读取与过滤规则相关的键值对时会出现问题
  :::

### 填法示例

```yaml
repo:
  - name: "仓库1"
    url: "https://gihub.com/User1/Repo1.git"
    branch: "main"
    enable: true
    cronSettings:
      updateTaskList: true
      autoDisable: false
      addNotify: true
      delNotify: true
      scriptsPath: ''
      scriptsType:
        - js
      whiteList: ''
      blackList: ''
  - name: "仓库2"
    url: "https://gitlab.com/User2/Repo2.git"
    branch: "master"
    enable: false
```

配置好后你需要执行 `update repo` 命令来使该配置生效

:::note 如何修改已配置仓库的远程地址？
针对同一个仓库直接修改 `url` 键值对即可，同一个仓库指的是两个不同的地址所指向的仓库拥有相同的用户名和仓库名，否则将被视为一个新的仓库
:::

## 删除已配置的脚本仓库

1. 手动删除配置文件中的仓库配置
2. 手动删除相关定时任务，你可以通过后台管理面板的定时任务页进行操作，在任务名称列设置过滤后批量删除
3. 手动删除本地仓库文件，一般在 **repo** 目录下，文件夹名格式为 `作者名_仓库名`

## 关于定时任务

根据工作原理，你可能会遇到下方提到的特殊情况，你应该了解这些情况并且知道如何解决

1. 修改定时过滤规则并不会影响已经添加的定时任务，所以如果有不合适的定时任务则需要你手动进行删除。

2. 匹配定时任务仅支持处理基于文件增删变动的情况，这意味着如果在首次克隆仓库之后再配置启用仓库定时任务是无效的，因为没有检测到文件变动。不过你可以通过删除本地仓库目录来解决这个问题，这样在下次更新时就会因为克隆仓库而检测到文件变动，不过这样会覆盖用户关于导入定时任务的手动修改数据，所以最好从一开始就确定使用需求。

### 定时算法

从文件内容的备注中提取定时表达式

```bash
bash /arcadia/web/core/file/resolve/resolve.sh <path> | jq
```
你可通过该命令来体验本项目的定时算法，如果输出的规则与文件内容中标注的定时规则不一致那说明该算法未识别到或检测到语法错误，届时会随机生成一个每天执行一次的定时规则
