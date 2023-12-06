---
title: 运行脚本
description: 如何运行一个脚本是最需要掌握的基础技能
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { CHECK, CLOSE } from '@site/src/components/Icon';
import APITable from '@site/src/components/APITable';
import { ICON } from '@site/src/components/Icon';

你可以在本篇文档中学习如何运行脚本这一基础命令，由于定时任务的运行也是建立在该命令上的，所以你必须学会它

## 执行方式

<Tabs>
<TabItem value="normal" label="普通" default>

```bash
task run <name/path/url>
```

</TabItem>
<TabItem value="concurrency" label="并发">

```bash
task conc <name/path/url>
```

并发是为每个账号作为单独的进程同时在后台运行

:::warning
并发执行非常消耗资源不要盲目使用，否则机器资源占满可能会导致连不上终端，若想恢复也许只能操作强制关机重启
:::

</TabItem>
</Tabs>

### 参数解读

- #### `name 脚本名称`

  仅限 `scripts` 个人脚本目录下的脚本，并且仅涵盖 `根目录`，你可以把你常用的脚本存放在这里

- #### `path 路径`

  相对路径或绝对路径，支持使用 `.` 或 `./` 作为当前目录和用 `../` 作为上级目录，如果执行本地的个人脚本则可以省略路径  
  如果执行的是已配置的脚本仓库中的脚本可以使用相对路径，例如 `/arcadia/repo/<仓库目录名称>/example.js` 可以使用 `repo/example.js` 替代

- #### `url 链接地址`

  执行后脚本默认保存在 `scripts` 个人脚本目录，支持链接自动纠正功能  
  链接自动纠正功能是当拉取位于远程托管仓库的脚本时可自动将 _blob_ 链接转换为 _raw_ 原始文件链接，此功能已应用到整个项目

### 关于运行日志

脚本运行后会自动将运行日志存放在 **log** 目录下的文件夹内，文件夹名为`脚本名去后缀`，日志文件名为日期，会以目录的形式进行分类  
目录名中的主要组成部分是脚本名称，非导入脚本配置的目录名称为`<仓库名/raw>_脚本名去后缀`，中间用下划线分割

### 支持运行的脚本类型

目前支持运行 `js` `py` `ts` `sh` 共四种类型的脚本，项目已默认预装了 `JavaScript`、`TypeScript`、`Python` 的运行环境，后续会适配更多类型的脚本

当执行本地脚本文件时，脚本名的后缀格式（脚本类型）可以省略，届时将启用模糊查找，优先级为 `JavaScript` > `Python` > `TypeScript` > `Shell`，当存在同名脚本时仍适用此规则

### 关于运行脚本所需的依赖库

这部分内容与项目命令无关，用于解决脚本运行时缺少依赖库报错的问题

:::info 你需要知道的
当脚本报错提示 `need module xxx` 类似字样说明缺少脚本运行所需的依赖库，看见 `module` 字样应立即联想到模块上  
如果缺少的依赖中带有 `/` 则表示本地依赖文件，一般开发者都会提供相关组件，注意与安装依赖库区分开不要弄混
:::

<Tabs>
  <TabItem value="JavaScript" label="JavaScript / TypeScript" default>

  适用于 <ICON>vscode-icons:file-type-light-js</ICON> `.js` 和 <ICON>vscode-icons:file-type-typescript</ICON> `.ts` 脚本

  ```bash
  npm install -g <xxx>
  ```

  默认命令 `npm install <xxx>` 安装的依赖库是相对位置的，使用 -g 命令选项代表全局安装即不需要解决目录关系，因为一般来说这样安装更省事  
  但某些情况下可能不适合全局安装，你可以到脚本所在根目录使用默认命令 `npm install <xxx>` 安装，也可以使用 `pnpm` 或 `yarn` 指令

  </TabItem>
  <TabItem value="Python" label="Python">

  适用于 <ICON>vscode-icons:file-type-python</ICON> `.py` 脚本

  ```bash
  pip3 install <xxx>
  ```

  </TabItem>
</Tabs>

## 命令选项

<APITable>

|          选项          | 普通 | 并发 | 描述 |
| :-------------------: | - | - | ----- |
| `-l`, `--loop`       | <CHECK/> | <CLOSE/> | 循环运行，连续多次运行脚本，选项后需跟 _循环次数(正整数)_ 作为参数值，该参数与 **等待执行** 和 **延迟执行** 参数同时使用时仍然有效互不干涉 |
| `-s`, `--silent`     | <CHECK/> | <CHECK/> | 静默运行，静默运行任务不推送任何通知消息 |
| `-w`, `--wait`       | <CHECK/> | <CHECK/> | 推迟执行，等待指定时间后再运行脚本，选项后需跟 _等待时间单位_ 作为参数值，具体参照 [sleep](https://www.runoob.com/linux/linux-comm-sleep.html) 命令的用法 |
| `-d`, `--daemon`     | <CHECK/> | <CLOSE/> | 守护进程，将脚本设置为守护进程保持在后台运行，期间中断或结束会自动重新运行 |
| `-a`, `--agent`      | <CHECK/> | <CHECK/> | 网络代理，使脚本通过 HTTP/HTTPS 全局代理进行网络请求，目前仅支持 JavaScript/TypeScript 脚本，使用该功能需要自行在配置文件对应处定义代理地址变量 |
| `-D`, `--delay`      | <CHECK/> | <CHECK/> | 延迟执行，随机倒数一定秒数后再运行脚本，该秒数上限可以在配置文件中定义 |
| `-T`, `--Timeout`    | <CHECK/> | <CHECK/> | 运行超时，设置运行任务超时机制，选项后需跟 [timeout](https://www.coonote.com/linux/linux-cmd-timeout.html) 命令选项作为选项值 |
| `-p`, `--proxy`      | <CHECK/> | <CHECK/> | 下载代理，仅适用于执行位于 GitHub 仓库的远程脚本，该代理固定为 [jsDelivr](https://www.jsdelivr.com/?docs=gh) 公共 CDN 加速代理 |
| `-c`, `--cookie`     | <CHECK/> | <CHECK/> | 指定账号，选项后需跟 _账号序号_ 作为参数值，多个账号用 `,` 隔开，账号区间用 `-` 连接，可以用 `%` 表示账号总数 |
| `-g`, `--grouping`   | <CHECK/> | <CLOSE/> | 账号分组，使每组账号单独运行脚本，选项后需跟 _账号序号并分组_ 作为参数值，参数用法与 **指定账号** 相同，组与组之间用 `@` 隔开 |
| `-b`, `--background` | <CHECK/> | <CLOSE/> | 后台运行，不在前台输出脚本执行进度，不占用终端命令行 |

</APITable>

:::note 使用方法
追加在命令的末尾，熟练后可以使用简写，可以通过 `task run` 或 `task conc` 快速获取命令帮助
:::

### 用法解读


  - #### 关于指定账号相关参数的用法示例

    :::warning 使用须知
    在某些情况下**运行脚本频率**、**单账号运行频率**过高可能会造成严重 "后果" ，例如IP被限制、账号被拉黑
    :::

    - ##### 指定第 **1** 和第 **5** 个账号运行脚本

      ```bash 
      task run example.js --cookie 1,5
      ```

    - ##### 指定前 **10** 个账号运行脚本

      ```bash
      task run example.js --cookie 1-10
      ```

    - ##### 指定第 **2** 至最后一个账号运行脚本

      ```bash
      task run example.js --cookie 2-%
      ```

    - ##### 指定第 **1** 和第 **5** 个账号为一组、第 **2** 和第 **6** 个账号为一组运行脚本

      ```bash
      task run example.js --grouping 1,5@2,6
      ```

      :::note 账号分组的意义？
      1.有些脚本不能有效运行全部账号，一次只能运行单个或指定数量的账号  
      2.连续执行不能满足用户助力需求  
      3.减少出现由于执行频率过高所造成的影响
      :::

  - #### 关于如何管理守护进程脚本

    - ##### 查看有哪些守护进程正在运行

      ```bash
      pm2 list
      ```
      默认有四个项目内置服务 `web_server` `web_terminal` `inner_server` `tgbot`，请不要删除它们其中的任何一个

    - ##### 停止运行

      ```bash
      pm2 delete <任务名>
      ```


## 辅助命令

### 终止运行

```bash
task stop <name/path>
```
终止某个或某些正在运行中的脚本，根据脚本名称搜索对应的进程并立即杀死，当脚本报错死循环时建议使用此功能

### 全部运行

```bash
source runall
```
这是一个定制的脚本，通过 `交互` 选择执行模式运行指定范围的脚本，相当于批量运行脚本，时间较长不要盲目使用

### 列出本地脚本

```bash
task list <path>
```
查看指定路径下有哪些可以运行的脚本，可显示脚本修改时间和脚本文件大小，`<path>` 支持用 `.` 或 `./` 表示当前目录和用 `../` 表示上级目录
