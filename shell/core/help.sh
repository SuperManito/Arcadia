#!/bin/bash
## Modified: 2024-10-11

function _print_help_title() {
  if [ "$1" ]; then
    echo -e "\n❖ Arcadia CLI - $1"
  else
    echo -e "\n❖ Arcadia CLI"
  fi
}

function _print_help_main() {
  _print_help_title
  echo -e "
  运行代码相关
  ${BLUE}run <args>${PLAIN}      执行代码文件（脚本）
  ${BLUE}stop <args>${PLAIN}     终止运行中的代码程序（脚本）
  ${BLUE}list <args>${PLAIN}     列出指定目录下可执行的代码文件清单
  ${BLUE}ps${PLAIN}              查看资源消耗和运行中的代码进程
  ${BLUE}cleanup${PLAIN}         终止阻塞的代码进程，释放内存

  更新与升级
  ${BLUE}update <args>${PLAIN}   同步用户配置，更新导入的代码文件
  ${BLUE}upgrade${PLAIN}         更新项目源码，升级版本

  用户配置管理
  ${BLUE}repo <args>${PLAIN}     导入代码仓库配置
  ${BLUE}raw <args>${PLAIN}      导入远程文件配置
  ${BLUE}envm <args>${PLAIN}     管理环境变量数据

  服务管理
  ${BLUE}service <args>${PLAIN}  项目后端服务
  ${BLUE}tgbot <args>${PLAIN}    电报机器人

  其它
  ${BLUE}rmlog${PLAIN}           清理运行日志文件
  ${BLUE}notify <args>${PLAIN}   推送自定义通知消息
"
}

function _print_help_service() {
  _print_help_title "后端服务管理"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd service <args>${PLAIN}

  子命令：

    ${BLUE}start${PLAIN}    开启或重启
    ${BLUE}stop${PLAIN}     停止（项目依赖后端长期运行，请不要长期关闭）
    ${BLUE}status${PLAIN}   查看各服务状态
    ${BLUE}info${PLAIN}     查看登录信息
    ${BLUE}respwd${PLAIN}   重置密码

  命令帮助：

    ${BLUE}<args>${PLAIN} 子命令
"
}

function _print_help_tgbot() {
  _print_help_title "电报机器人服务管理"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd tgbot <args>${PLAIN}

  子命令：

    ${BLUE}start${PLAIN}    开启或重启
    ${BLUE}stop${PLAIN}     停止
    ${BLUE}logs${PLAIN}     查看日志
    ${BLUE}update${PLAIN}   更新升级

  命令帮助：

    ${BLUE}<args>${PLAIN} 子命令
  
  注：项目部分功能依赖后端服务持续运行，请不要长期关闭
"
}

function _print_help_run() {
  _print_help_title "执行代码文件"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd run <name/path/url> [--options]${PLAIN}

  命令选项：

    ${BLUE}-l${PLAIN}, ${BLUE}--loop${PLAIN}                  循环运行，连续多次的执行代码文件，选项后需跟循环次数
    ${BLUE}-s${PLAIN}, ${BLUE}--silent${PLAIN}                静默运行，不推送任何通知消息
    ${BLUE}-w${PLAIN}, ${BLUE}--wait${PLAIN}                  推迟执行，等待指定时间后再运行任务，选项后需跟时间值
    ${BLUE}-D${PLAIN}, ${BLUE}--delay${PLAIN}                 延迟执行，随机倒数一定秒数后再执行代码文件
    ${BLUE}-d${PLAIN}, ${BLUE}--daemon${PLAIN}                守护进程，将代码文件设置为守护进程保持在后台运行，期间中断或结束会自动重新运行
    ${BLUE}-a${PLAIN}, ${BLUE}--agent${PLAIN}                 网络代理，使代码文件通过 HTTP/HTTPS 全局代理进行网络请求，仅支持 Node.js 和 TypeScript 脚本
    ${BLUE}-T${PLAIN}, ${BLUE}--timeout${PLAIN}               运行超时，设置运行任务超时机制，选项后需跟 timeout 命令选项
    ${BLUE}-N${PLAIN}, ${BLUE}--no-log${PLAIN}                忽略日志，不存储代码运行日志到本地
    ${BLUE}-p${PLAIN}, ${BLUE}--proxy${PLAIN}                 下载代理，仅适用于执行位于 GitHub 仓库的代码文件，代理固定为 jsDelivr CDN
    ${BLUE}-c${PLAIN}, ${BLUE}--concurrent${PLAIN}            并发运行，默认运行1个任务，若想增加运行任务数量那么请传参任务数量
    ${BLUE}-b${PLAIN}, ${BLUE}--background${PLAIN}            后台运行，不在前台输出代码执行进度，不占用终端命令行
    ${BLUE}-r${PLAIN}, ${BLUE}--recombine-env${PLAIN}         变量重组，按照指定顺序重新组合复合变量的值，选项后需跟变量名称、分隔符、重组表达式
                                          表达式语法：多个值用 \",\" 隔开，值区间用 \"-\" 连接，可以用 \"%\" 表示值的总数
    ${BLUE}-R${PLAIN}, ${BLUE}--recombine-env-group${PLAIN}   分组运行，为每组变量单独运行，是变量重组的扩展，传参基本一致，其中重组表达式内用 \"@\" 来区分不同组
    ${BLUE}-S${PLAIN}, ${BLUE}--split-env${PLAIN}             拆分运行，将复合变量的值拆分后为每个值声明变量并单独运行代码文件，选项后需跟需要拆分的变量名称、分隔符

    ${BLUE}-B${PLAIN}，${BLUE}--use-bun${PLAIN}               使用 Bun 作为 JavaScript 和 TypeScript 的运行时环境，替代默认的 Node.js 和 ts-node

  命令帮助：

    ${BLUE}<name>${PLAIN} 文件名(仅scripts目录)  ${BLUE}<path>${PLAIN} 相对路径或绝对路径  ${BLUE}<url>${PLAIN} 链接地址  ${BLUE}[--options]${PLAIN} 命令选项
"
}

function _print_help_repo() {
  _print_help_title "导入代码仓库配置"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd repo <name> <url> <branch> [--options]${PLAIN}

  命令选项：

    ${BLUE}--enable${PLAIN}             是否启用仓库
    ${BLUE}--updateTaskList${PLAIN}     是否更新定时任务
    ${BLUE}--scriptsPath${PLAIN}        定时文件路径
    ${BLUE}--scriptsType${PLAIN}        定时文件格式，多个用 \"|\" 分开
    ${BLUE}--whiteList${PLAIN}          定时文件匹配白名单
    ${BLUE}--blackList${PLAIN}          定时文件匹配黑名单
    ${BLUE}--autoDisable${PLAIN}        是否自动禁用新的定时任务
    ${BLUE}--addNotify${PLAIN}          是否为新增定时任务推送通知提醒
    ${BLUE}--delNotify${PLAIN}          是否为过期定时任务推送通知提醒
    ${BLUE}--help${PLAIN}               查看此命令帮助

  命令帮助：

    ${BLUE}<name>${PLAIN} 配置名称  ${BLUE}<url>${PLAIN} 链接地址  ${BLUE}<branch>${PLAIN} 分支名称  ${BLUE}[--options]${PLAIN} 命令选项
"
}
function _print_help_raw() {
  _print_help_title "导入远程文件配置"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd raw <name> <url> [--options]${PLAIN}

  命令选项：

    ${BLUE}--updateTaskList${PLAIN}     是否更新定时任务
    ${BLUE}--help${PLAIN}               查看此命令帮助

  命令帮助：

    ${BLUE}<name>${PLAIN} 配置名称  ${BLUE}<url>${PLAIN} 链接地址  ${BLUE}[--options]${PLAIN} 命令选项
"

}
function _print_help_update() {
  _print_help_title "更新导入的代码文件"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd update <args>${PLAIN}

  子命令：

    ${BLUE}repo${PLAIN}      更新代码仓库
    ${BLUE}raw${PLAIN}       更新远程文件
    ${BLUE}extra${PLAIN}     执行自定义更新脚本
    ${BLUE}all${PLAIN}       更新除指定仓库以外的所有内容
    ${BLUE}<path>${PLAIN}    更新指定路径下的代码仓库

  命令帮助：

    ${BLUE}<path>${PLAIN} 相对路径或绝对路径
"
}
function _print_help_envm() {
  _print_help_title "用户环境变量管理"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd envm <args> [...]${PLAIN}

  子命令：

    ${BLUE}add [<name> <value> <remark>]${PLAIN}     添加变量
    ${BLUE}edit [<name> <value> <remark>]${PLAIN}    修改变量
    ${BLUE}del [<name>]${PLAIN}                      删除变量
    ${BLUE}search [<string>]${PLAIN}                 查询变量
    ${BLUE}enable <name>${PLAIN}                     启用变量
    ${BLUE}disable <name>${PLAIN}                    禁用变量

  命令帮助：

    ${BLUE}[xxx]${PLAIN} 可选的快捷子命令  ${BLUE}<name>${PLAIN} 环境变量名称  ${BLUE}<value>${PLAIN} 环境变量值
    ${BLUE}<remark>${PLAIN} 环境变量备注  ${BLUE}<string>${PLAIN} 搜索关键字

  注：默认为交互式操作，当前仅支持用户配置文件（非数据库）中用 ${BLUE}export${PLAIN} 关键字声明的全局变量
"
}

function _print_help_notify() {
  _print_help_title "自定义推送通知提醒"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd notify <title> <content>${PLAIN}

  命令帮助：

    ${BLUE}<title>${PLAIN} 通知标题  ${BLUE}<content>${PLAIN} 通知内容
"
}

function _print_help_list() {
  _print_help_title "列出代码文件清单"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd list <path>${PLAIN}

  命令帮助：

    ${BLUE}<path>${PLAIN} 相对路径或绝对路径
"
}

function _print_help_stop() {
  _print_help_title "终止运行中的代码程序"
  echo -e "
  使用方法：

    ${BLUE}$ArcadiaCmd stop <name/path>${PLAIN}

  命令帮助：

    ${BLUE}<name>${PLAIN} 文件名(仅scripts目录)  ${BLUE}<path>${PLAIN} 相对路径或绝对路径
"
}

## 命令帮助
function print_help() {
  case "$1" in
  "${ArcadiaCmd}")
    _print_help_main
    ;;
  run)
    _print_help_run
    ;;
  service)
    _print_help_service
    ;;
  tgbot)
    _print_help_tgbot
    ;;
  repo)
    _print_help_repo
    ;;
  raw)
    _print_help_raw
    ;;
  update)
    _print_help_update
    ;;
  envm)
    _print_help_envm
    ;;
  notify)
    _print_help_notify
    ;;
  list)
    _print_help_list
    ;;
  stop)
    _print_help_stop
    ;;
  esac
}
