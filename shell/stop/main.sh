#!/bin/bash

## 通过进程树终止任务
function _kill_process_tree() {
    local pid=$1
    # 获取所有子进程
    local children=$(pgrep -P ${pid} 2>/dev/null)
    for child in ${children}; do
        _kill_process_tree ${child}
    done
    kill -9 ${pid} 2>/dev/null
}

## 终止运行
# stop <name/path>
function command_stop_main() {
    local InputContent=$1
    local ProcessShielding="grep|pkill|/bin/bash /usr/local/bin| ${ArcadiaCmd} "
    ## 匹配代码文件
    import core/script
    find_script ${InputContent}
    local ProcessKeywords="${FileName}\.${FileSuffix}\$"

    local _has_killed="false"

    ## 检查编排进程 PID 文件（终止整个进程树）
    for _run_pid_file in ${LogTmpDir}/.run_${FileName}_*.pid; do
        [[ ! -f "${_run_pid_file}" ]] && continue
        local _run_pid=$(cat "${_run_pid_file}" 2>/dev/null)
        if [[ -n "${_run_pid}" ]] && kill -0 ${_run_pid} 2>/dev/null; then
            # 终止整个进程树
            _kill_process_tree ${_run_pid}
            rm -f "${_run_pid_file}"
            _has_killed="true"
        else
            rm -f "${_run_pid_file}"
        fi
    done

    ## 检查是否存在残余进程
    local _residual_info=$(ps -eo pid,cmd --no-headers | grep "${ProcessKeywords}" | grep -Ev "${ProcessShielding}")
    if [[ -n "${_residual_info}" ]]; then
        ## 终止残余进程
        kill -9 $(echo "${_residual_info}" | awk '{print $1}' | tr -s '\n' ' ') >/dev/null 2>&1
        sleep 1
        kill -9 $(ps -ef | grep "${ProcessKeywords}" | grep -Ev "${ProcessShielding}" | awk '$0 !~/grep/ {print $2}' | tr -s '\n' ' ') >/dev/null 2>&1
        ## 验证
        ps -ef | grep -Ev "grep|pkill" | grep "${FileName}\.${FileSuffix}$" -wq
        if [ $? -eq 0 ]; then
            echo -e "\n$FAIL 未能成功终止部分进程，请尝试手动 ${BLUE}kill -9 <pid>${PLAIN}\n"
        else
            _has_killed="true"
            echo -e "\n$SUCCESS 已终止所有相关进程\n"
        fi
    else
        if [[ "${_has_killed}" == "true" ]]; then
            echo -e "\n$SUCCESS 已终止所有相关进程\n"
        else
            echo -e "\n$ERROR 未检测到与 ${BLUE}${FileName}${PLAIN} 代码文件相关的进程，可能此时没有正在运行，请确认！\n"
        fi
    fi
}

function command_stop() {
    case $# in
    0)
        print_command_help stop
        ;;
    1)
        command_stop_main $1
        ;;
    *)
        output_command_error 2 # 命令过多
        ;;
    esac
}
