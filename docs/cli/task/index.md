---
title: task
---

```
❖ 处理任务指令

  命令帮助：

    task run <name/path/url> [--options]    ✧ 普通执行，前台运行并在命令行输出进度，命令选项的用法详见 task run 命令帮助
    task conc <name/path/url> [--options]   ✧ 并发执行，后台运行不在命令行输出进度，命令选项的用法详见 task conc 命令帮助
    task stop <name/path>                   ✧ 终止执行，根据脚本匹配对应的进程并立即杀死

    task ps                                 ✧ 查看设备资源消耗情况和正在运行的脚本进程
    task rmlog                              ✧ 删除一定天数的由项目和运行脚本产生的各类日志文件
    task cleanup                            ✧ 检测并终止卡死状态的脚本进程，以释放内存占用提高运行效率

    task list <path>                        ✧ 列出本地脚本清单，默认列出已配置的脚本，支持指定路径
    task exsc                               ✧ 导出互助码变量和助力格式，互助码从最后一个日志提取，受日志内容影响
    task cookie <args>                      ✧ 检测账号是否有效 check，更新wskey账号 update，获取收支 beans，查看账号列表 list
    task notify <title> <content>           ✧ 自定义推送通知消息，参数为标题加内容，支持转义字符

  命令注释：

    <args> 子命令  <name> 脚本名(仅scripts目录)  <path> 相对路径或绝对路径  <url> 链接地址  [--options] 命令选项
```

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```
