#!/bin/bash
## Modified: 2024-04-18

## 终止执行
# stop <name/path>
function command_stop_main() {
    local InputContent=$1
    local ProcessShielding="grep|pkill|/bin/bash /usr/local/bin| ${ArcadiaCmd} "
    ## 匹配代码文件
    import core/script
    find_script ${InputContent}
    local ProcessKeywords="${FileName}\.${FileSuffix}\$"
    ## 判定对应代码文件是否存在相关进程
    ps -ef | grep -Ev "grep|pkill" | grep "${FileName}\.${FileSuffix}$" -wq
    local EXITSTATUS=$?
    if [[ ${EXITSTATUS} == 0 ]]; then
        ## 列出检测到的相关进程
        echo -e "\n检测到下列关于 ${BLUE}${FileName}.${FileSuffix}${PLAIN} 代码文件的进程："
        echo -e "\n${BLUE}[进程]  [任务]${PLAIN}"
        ps -axo pid,command | grep "${ProcessKeywords}" | grep -Ev "${ProcessShielding}"
        ## 终止前等待确认
        # echo -en "\n$WORKING 进程将在 ${BLUE}3${PLAIN} 秒后终止，可通过 ${BLUE}Ctrl + Z${PLAIN} 中断此操作..."
        # sleep 3
        # echo ''
        ## 杀死进程
        kill -9 $(ps -ef | grep "${ProcessKeywords}" | grep -Ev "${ProcessShielding}" | awk '$0 !~/grep/ {print $2}' | tr -s '\n' ' ') >/dev/null 2>&1
        sleep 1
        kill -9 $(ps -ef | grep "${ProcessKeywords}" | grep -Ev "${ProcessShielding}" | awk '$0 !~/grep/ {print $2}' | tr -s '\n' ' ') >/dev/null 2>&1

        ## 验证
        ps -ef | grep -Ev "grep|pkill" | grep "\.${FileSuffix}$" -wq
        if [ $? -eq 0 ]; then
            ps -axo pid,command | less | grep "${ProcessKeywords}" | grep -Ev "${ProcessShielding}"
            echo -e "\n$FAIL 未能成功终止进程，请尝试手动 ${BLUE}kill -9 <pid>${PLAIN}\n"
        else
            echo -e "\n$SUCCESS 已终止相关进程\n"
        fi
    else
        echo -e "\n$ERROR 未检测到与 ${BLUE}${FileName}${PLAIN} 代码文件相关的进程，可能此时没有正在运行，请确认！\n"
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
