#!/bin/bash
## Modified: 2024-11-22

## 目录
RootDir=${ARCADIA_DIR}
SrcDir=$RootDir/src
ShellDir=$SrcDir/shell
SampleDir=$SrcDir/sample
UtilsDir=$SrcDir/utils
BotSrcDir=$UtilsDir/bot_src
# 生产环境
ConfigDir=$RootDir/config
ScriptsDir=$RootDir/scripts
RepoDir=$RootDir/repo
RawDir=$RootDir/raw
BotDir=$RootDir/tgbot
LogDir=$RootDir/log
LogTmpDir=$LogDir/.tmp
BotLogDir=$LogDir/TelegramBot

## 文件
FileConfUser=$ConfigDir/config.sh
FileConfSample=$SampleDir/config.sh
FileEnvUser=$ConfigDir/env.sh
FileSyncConfUser=$ConfigDir/sync.yml
FileSyncConfSample=$SampleDir/sync.yml
FileAuthUser=$ConfigDir/auth.json
FileAuthSample=$SampleDir/auth.json
FileUpdateExtra=$ConfigDir/update_extra.sh
FileInitExtra=$ConfigDir/init_extra.sh
FileTaskBeforeExtra=$ConfigDir/task_before_extra.sh
FileTaskAfterExtra=$ConfigDir/task_after_extra.sh
FileNotify=$UtilsDir/notify.js
FileSendNotify=$UtilsDir/sendNotify.js
FileSendNotifyUser=$ConfigDir/sendNotify.js
FileSendMark=$RootDir/send_mark
FilePm2List=$RootDir/.pm2_list.log
FileProcessList=$RootDir/.process_list.log
FileSSHConfigUser=/root/.ssh/config

## 清单
ListOldScripts=$LogTmpDir/scripts_old.list
ListNewScripts=$LogTmpDir/scripts_new.list
ListAddScripts=$LogTmpDir/scripts_add.list
ListDelScripts=$LogTmpDir/scripts_del.list
ListConfScripts=$LogTmpDir/scripts_conf.json

## 字符串
ArcadiaCmd="arcadia"
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
PURPLE='\033[35m'
AZURE='\033[36m'
PLAIN='\033[0m'
BOLD='\033[1m'
SUCCESS="[\033[1;32m成功${PLAIN}]"
COMPLETE="[\033[1;32m完成${PLAIN}]"
WARN="[\033[1;5;33m注意${PLAIN}]"
ERROR="[\033[1;31m错误${PLAIN}]"
FAIL="[\033[1;31m失败${PLAIN}]"
TIP="[\033[1;32m提示${PLAIN}]"
WORKING="[\033[1;36m >_ ${PLAIN}]"
EXAMPLE="[\033[1;35m参考命令${PLAIN}]"

## 导入模块
function import() {
    local target
    if [ -d "$ShellDir/$1" ]; then
        target="$ShellDir/$1/main.sh"
    else
        target="$ShellDir/$1.sh"
    fi
    if [ -s "${target}" ]; then
        [ ! -x "${target}" ] && chmod +x "${target}" >/dev/null 2>&1
        source "${target}"
    else
        echo -e "\n$ERROR ${target} 不存在，跳过导入！\n"
        exit
    fi
}

## 导入配置文件
function import_config() {
    if [ -f $FileConfUser ]; then
        source $FileConfUser
    else
        echo -e "\n$ERROR 配置文件 $FileConfUser 不存在，请检查是否移动过该文件！\n"
        exit
    fi
}
function import_config_not_check() {
    if [ -f $FileConfUser ]; then
        source $FileConfUser >/dev/null 2>&1
    fi
}

## 加载数据库内的用户环境变量
function load_user_env() {
    # 此脚本在每次操作数据库后由后端自动生成
    if [ -f $FileEnvUser ]; then
        source $FileEnvUser >/dev/null 2>&1
    fi
}

## 计算字符串长度
function string_length() {
    local text=$1
    echo "${#text}"
}

## 打印错误类型消息并跳出
function output_error() {
    [ "$1" ] && echo -e "\n$ERROR $1\n"
    exit 1
}
function output_fail() {
    [ "$1" ] && echo -e "\n$FAIL $1\n"
    exit 1
}
function output_command_error() {
    case $1 in
    1)
        echo -e "\n$ERROR 命令不正确，请确认后重试！\n"
        ;;
    2)
        echo -e "\n$ERROR 输入命令过多，请确认后重试！\n"
        ;;
    esac
    exit
}

## 推送通知
function send_notify() {
    local title=$(echo "$1" | sed "s|-|_|g")
    local msg="$(echo -e "$2")"
    import_config_not_check
    if [[ "${EnableCustomNotify}" == true ]] && [ -s $FileSendNotifyUser ]; then
        node $FileNotify "$title" "$msg" "true"
    else
        node $FileNotify "$title" "$msg"
    fi
}

## 创建目录
function make_dir() {
    while [ $# -gt 0 ]; do
        [ ! -d "$1" ] && mkdir -p "$1"
        shift
    done
}

## 获取绝对路径
function get_absolute_path() {
    local path
    local input="$1"
    echo "${input}" | grep "^$RootDir" -q
    if [ $? -eq 0 ]; then
        path="${input}"
    else
        ## 处理是 . 的路径
        echo "${input}" | grep -E "^\.$" -q
        if [ $? -eq 0 ]; then
            input="$(pwd)"
        fi
        ## 处理开头是 ./ 的路径
        echo "${input}" | grep -E "^\./" -q
        if [ $? -eq 0 ]; then
            input="$(echo "${input}" | sed "s|^\./|$(pwd)/|g")"
        fi
        ## 处理开头是 ../ 或是 .. 的路径
        echo "${input}" | grep -E "^\.\./|^\.\.$" -q
        if [ $? -eq 0 ]; then
            local tmp_pwd="$(pwd | sed "s|/$(pwd | awk -F '/' '{printf$NF}')||g")"
            input="$(echo "${input}" | sed "s|^\.\./|${tmp_pwd}/|g; s|^\.\.$|${tmp_pwd}/|g")"
        fi
        ## 处理结尾是 /.. 的路径
        echo "${input}" | grep -E "/\.\.$" -q
        if [ $? -eq 0 ]; then
            local tmp_dir="$(dirname "${input}")"
            echo "${tmp_dir}" | grep "^/" -q
            if [ $? -eq 0 ]; then
                input="${tmp_dir}"
            fi
        fi
        ## 判断是否存在同名仓库目录
        local tmp_dir_name=$(echo "${input}" | awk -F '/' '{printf$1}')
        if [[ "${tmp_dir_name}" && -d "$RepoDir/$tmp_dir_name" ]]; then
            path="$(echo "${input}" | sed "s|^|$RepoDir/|g")"
        else
            echo "${input}" | grep "^/" -q
            if [ $? -eq 0 ]; then
                path="${input}"
            else
                if [[ "$(pwd)" == "/root" ]]; then
                    path="$(echo "${input}" | sed "s|^|$RootDir/|g")"
                else
                    path="$(echo "${input}" | sed "s|^|$(pwd)/|g")"
                fi
            fi
        fi
    fi
    if [[ "${path}" ]]; then
        ## 去除路径末尾的斜杠
        echo "${path}" | grep "/$" -q
        if [ $? -eq 0 ]; then
            path="${path%?}"
        fi
        echo "${path}"
    fi
}

## 打印命令帮助
function print_command_help() {
    import core/help
    if [ $1 ]; then
        print_help $1
    else
        print_help "${ArcadiaCmd}"
    fi
}
