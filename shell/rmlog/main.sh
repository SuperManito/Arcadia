#!/bin/bash
## Modified: 2026-03-23

## 删除日志功能
# rmlog [days]
function command_rmlog_main() {
    local current_dir=$(pwd)

    ## 删除日志（通用）
    # 根据时间格式 YYYY-mm-dd HH:MM:SS 判断
    function rm_log_universal() {
        local target_file="$1"
        if [ -f $target_file ]; then
            local timestamp=$(($(date "+%s") - 86400 * ${RmDays}))
            local del_format_date="$(date -d "@${timestamp}" "+%Y-%m-%d")"
            local match_line=$(grep -n --binary-files=text "${del_format_date}" $target_file | head -1 | awk -F ":" '{print $1}')
            local line_end=$((match_line - 3))
            [ ${line_end} -gt 0 ] && perl -i -ne "{print unless 1 .. ${line_end} }" $target_file
        fi
    }
    function rm_script_log() {
        local log_file_list=$(ls -l $LogDir/*/*.log $LogDir/*/*/*.log 2>/dev/null | awk '{print $9}' | grep -v "log/bot")
        for log in ${log_file_list}; do
            ## 文件名比文件属性获得的日期要可靠
            local log_date=$(echo ${log} | awk -F '/' '{print $NF}' | grep -Eo "20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]")
            [[ -z ${log_date} ]] && continue
            local time_difference=$(($(date +%s) - $(date +%s -d "${log_date}")))
            [ ${time_difference} -gt $((${RmDays} * 86400)) ] && rm -vf ${log}
        done
    }
    ## 删除日志目录下的空文件夹
    function rm_empty_dir() {
        cd $1
        for dir in $(ls); do
            if [ -d ${dir} ] && [[ $(ls ${dir}) == "" ]]; then
                rm -rf ${dir}
            fi
        done
    }
    ## 清理后端系统日志
    function rm_sys_log() {
        local data='{"days": '"${RmDays}"'}'
        local res=$(curl -s -X POST -H "Content-Type: application/json" -d "${data}" "http://127.0.0.1:5678/api/inner/log/clean")
        local result="$(echo "${res}" | jq -rc '.result')"
        local serverLog="$(echo "${result}" | jq -r ".serverLog")"
        local loginLog="$(echo "${result}" | jq -r ".loginLog")"
        if [[ "${loginLog}" -gt 0 ]]; then
            echo -e "已清理 ${BLUE}${loginLog}${PLAIN} 条系统登录日志"
        fi
        if [[ "${serverLog}" -gt 0 ]]; then
            echo -e "已清理 ${BLUE}${serverLog}${PLAIN} 条系统操作日志"
        fi
    }

    case $# in
    0)
        import_config_not_check
        local RmDays="${CLI_CONFIG_REMOVE_LOG_DAYS_AGO}"
        ;;
    1)
        local RmDays=$1
        ;;
    esac

    if [ -n "${RmDays}" ]; then
        echo -e "\n$WORKING 开始检索并删除超过 ${BLUE}${RmDays}${PLAIN} 天的日志文件...\n"
        rm_script_log                                            # 删除代码运行日志
        rm_log_universal "$LogDir/server.log"                    # 删除后端服务日志
        rm_log_universal "$LogDir/update.log"                    # 删除 update 的运行日志
        rm_log_universal "$BotLogDir/run.log"                    # 删除 Telegram Bot 的运行日志
        rm_empty_dir "$LogDir"                                   # 删除日志目录下的空文件夹
        [ -d "$ConfigDir/bak" ] && rm_empty_dir "$ConfigDir/bak" # 删除备份配置文件目录下的空文件夹
        [ -f $RootDir/core ] && rm -rf $RootDir/core             # 删除缓存
        rm_sys_log                                               # 清理后端系统日志
        echo -e "\n$COMPLETE 运行结束\n"
    fi
    cd $current_dir
}

function command_rmlog() {
    case $# in
    0)
        command_rmlog_main
        ;;
    1)
        if [[ $1 =~ ^[1-9][0-9]{0,3}$ ]]; then
            command_rmlog_main $1
        else
            output_command_error 1 # 命令错误
        fi
        ;;
    *)
        output_command_error 2 # 命令过多
        ;;
    esac
}
