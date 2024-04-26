#!/bin/bash
## Modified: 2024-04-18

## 添加
function add_environment_variable() {
    local VariableTmp="$1"
    local ValueTmp=$(echo "$2" | perl -pe '{s|[\.\<\>\/\[\]\!\@\#\$\%\^\&\*\(\)\-\+]|\\$&|g;}')
    case $# in
    2)
        local FullContent="export ${Variable}=\"${Value}\""
        ;;
    3)
        local RemarksTmp="$3"
        local FullContent="export ${Variable}=\"${Value}\" # ${RemarksTmp}"
        ;;
    esac
    grep "# 可在下方编写你需要用到的环境变量" $FileConfUser -q
    ## 插入内容
    if [ $? -eq 0 ]; then
        perl -i -pe "s|(# 可在下方编写你需要用到的环境变量.*$)|\1\n\n${FullContent}|" $FileConfUser
    else
        sed -i "9 i ${FullContent}" $FileConfUser
    fi
    echo -e "\n${GREEN}+${PLAIN} \033[42;30m${FullContent}${PLAIN}"
    echo -e "\n$COMPLETE 环境变量已添加\n"
}

## 修改
function edit_environment_variable() {
    local VariableTmp="$1"
    local OldContent NewContent Remarks InputA InputB InputC
    OldContent=$(grep ".*export ${VariableTmp}=" $FileConfUser | head -1)
    Remarks=$(grep ".*export ${VariableTmp}=" $FileConfUser | head -n 1 | awk -F "[\"\']" '{print$NF}')
    case $# in
    1)
        read -p "$(echo -e "\n${BOLD}└ 请输入环境变量 ${BLUE}${VariableTmp}${PLAIN} ${BOLD}新的值：${PLAIN}")" InputA
        local ValueTmp=$(echo "${InputA}" | perl -pe '{s|[\.\<\>\/\[\]\!\@\#\$\%\^\&\*\(\)\-\+]|\\$&|g;}')
        ## 判断变量备注内容
        if [[ ${Remarks} != "" ]]; then
            while true; do
                read -p "$(echo -e "\n${BOLD}└ 检测到该变量存在备注内容，是否修改? [Y/n] ${PLAIN}")" InputB
                [ -z ${InputB} ] && InputB=Y
                case ${InputB} in
                [Yy] | [Yy][Ee][Ss])
                    read -p "$(echo -e "\n${BOLD}└ 请输入环境变量 ${BLUE}${Variable}${PLAIN} ${BOLD}新的备注内容：${PLAIN}")" InputC
                    Remarks=" # ${InputC}"
                    break
                    ;;
                [Nn] | [Nn][Oo])
                    break
                    ;;
                *)
                    echo -e "\n${YELLOW}----- 输入错误 -----${PLAIN}"
                    ;;
                esac
            done
        fi
        ;;
    2)
        local ValueTmp=$(echo "$2" | perl -pe '{s|[\.\<\>\/\[\]\!\@\#\$\%\^\&\*\(\)\-\+]|\\$&|g;}')
        ;;
    3)
        local ValueTmp=$(echo "$2" | perl -pe '{s|[\.\<\>\/\[\]\!\@\#\$\%\^\&\*\(\)\-\+]|\\$&|g;}')
        Remarks=" # $3"
        ;;
    esac
    ## 修改
    sed -i "s/\(export ${VariableTmp}=\).*/\1\"${ValueTmp}\"${Remarks}/" $FileConfUser
    ## 前后对比
    NewContent=$(grep ".*export ${VariableTmp}=" $FileConfUser | head -1)
    echo -e "\n${RED}-${PLAIN} \033[41;37m${OldContent}${PLAIN}\n${GREEN}+${PLAIN} \033[42;30m${NewContent}${PLAIN}"
    ## 结果判定
    grep ".*export ${VariableTmp}=\"${ValueTmp}\"${Remarks}" -q $FileConfUser
    local EXITSTATUS=$?
    if [[ $EXITSTATUS -eq 0 ]]; then
        echo -e "\n$COMPLETE 环境变量修改完毕\n"
    else
        echo -e "\n$FAIL 未能修改环境变量，可能遇到了一些问题~\n"
    fi
}

## 启用与禁用
function control_environment_variable() {
    local VariableTmp Mod OldContent NewContent InputA InputB
    case $# in
    1)
        VariableTmp="$1"
        ;;
    2)
        Mod="$1"
        VariableTmp="$2"
        ;;
    *)
        output_command_error 1 # 命令错误
        ;;
    esac
    OldContent=$(grep ".*export ${VariableTmp}=" $FileConfUser | head -1)
    ## 判断变量是否被注释
    grep "[# ]export ${VariableTmp}=" -q $FileConfUser
    local EXITSTATUS=$?
    case $# in
    1)
        if [[ $EXITSTATUS -eq 0 ]]; then
            while true; do
                read -p "$(echo -e "\n${BOLD}└ 检测到该变量已禁用，是否启用? [Y/n] ${PLAIN}")" InputA
                [ -z ${InputA} ] && InputA=Y
                case ${InputA} in
                [Yy] | [Yy][Ee][Ss])
                    sed -i "s/.*export ${VariableTmp}=/export ${VariableTmp}=/g" $FileConfUser
                    break
                    ;;
                [Nn] | [Nn][Oo])
                    break
                    ;;
                *)
                    echo -e "\n${YELLOW}----- 输入错误 -----${PLAIN}"
                    ;;
                esac
            done
        else
            while true; do
                read -p "$(echo -e "\n${BOLD}└ 检测到该变量已启用，是否禁用? [Y/n] ${PLAIN}")" InputB
                [ -z ${InputB} ] && InputB=Y
                case ${InputB} in
                [Yy] | [Yy][Ee][Ss])
                    sed -i "s/.*export ${VariableTmp}=/# export ${VariableTmp}=/g" $FileConfUser
                    break
                    ;;
                [Nn] | [Nn][Oo])
                    break
                    ;;
                *)
                    echo -e "\n${YELLOW}----- 输入错误 -----${PLAIN}"
                    ;;
                esac
            done
        fi
        ;;
    2)
        if [[ $EXITSTATUS -eq 0 ]]; then
            case ${Mod} in
            enable)
                sed -i "s/.*export ${VariableTmp}=/export ${VariableTmp}=/g" $FileConfUser
                ;;
            disable)
                echo -e "\n$COMPLETE 该环境变量已经禁用，不执行任何操作\n"
                exit ## 终止退出
                ;;
            *)
                output_command_error 1 # 命令错误
                ;;
            esac
        else
            case ${Mod} in
            enable)
                echo -e "\n$COMPLETE 该环境变量已经启用，不执行任何操作\n"
                exit ## 终止退出
                ;;
            disable)
                sed -i "s/.*export ${VariableTmp}=/# export ${VariableTmp}=/g" $FileConfUser
                ;;
            *)
                output_command_error 1 # 命令错误
                ;;
            esac
        fi
        ;;
    esac

    ## 前后对比
    NewContent=$(grep ".*export ${VariableTmp}=" $FileConfUser | head -1)
    echo -e "\n${RED}-${PLAIN} \033[41;37m${OldContent}${PLAIN}\n${GREEN}+${PLAIN} \033[42;30m${NewContent}${PLAIN}"
    ## 结果判定
    if [[ ${OldContent} = ${NewContent} ]]; then
        echo -e "\n$FAIL 未能修改环境变量，可能遇到了一些问题~\n"
    else
        case ${Mod} in
        enable)
            echo -e "\n$COMPLETE 环境变量已启用\n"
            ;;
        disable)
            echo -e "\n$COMPLETE 环境变量已禁用\n"
            ;;
        esac
    fi
}

function handle_environment_variable() {
    local Variable Value Remarks FullContent Input1 Input2 Keys

    case $1 in

    ## 新增变量
    add)
        case $# in
        1)
            read -p "$(echo -e "\n${BOLD}└ 请输入需要添加的环境变量名称：${PLAIN}")" Variable
            ## 检测是否已存在该变量
            grep ".*export ${Variable}=" -q $FileConfUser
            if [ $? -eq 0 ]; then
                echo -e "\n${BLUE}检测到已存在该环境变量：${PLAIN}\n$(grep -n ".*export ${Variable}=" $FileConfUser | sed "s|^|第|g; s|:|行：|g")"
                while true; do
                    read -p "$(echo -e "\n${BOLD}└ 是否继续修改? [Y/n] ${PLAIN}")" Input1
                    [ -z ${Input1} ] && Input1=Y
                    case ${Input1} in
                    [Yy] | [Yy][Ee][Ss])
                        edit_environment_variable "${Variable}"
                        break
                        ;;
                    [Nn] | [Nn][Oo])
                        echo -e "\n$COMPLETE 结束，未做任何更改\n"
                        break
                        ;;
                    *)
                        echo -e "\n${YELLOW}----- 输入错误 -----${PLAIN}"
                        ;;
                    esac
                done
            else
                read -p "$(echo -e "\n${BOLD}└ 请输入环境变量 ${BLUE}${Variable}${PLAIN} ${BOLD}的值：${PLAIN}")" Value
                ## 插入备注
                while true; do
                    read -p "$(echo -e "\n${BOLD}└ 是否添加备注? [Y/n] ${PLAIN}")" Input2
                    [ -z ${Input2} ] && Input2=Y
                    case ${Input2} in
                    [Yy] | [Yy][Ee][Ss])
                        read -p "$(echo -e "\n${BOLD}└ 请输入环境变量 ${BLUE}${Variable}${PLAIN} ${BOLD}的备注内容：${PLAIN}")" Remarks
                        add_environment_variable "${Variable}" "${Value}" "${Remarks}"
                        break
                        ;;
                    [Nn] | [Nn][Oo])
                        add_environment_variable "${Variable}" "${Value}"
                        break
                        ;;
                    *)
                        echo -e "\n${YELLOW}----- 输入错误 -----${PLAIN}"
                        ;;
                    esac
                done
            fi
            ;;
        3 | 4)
            Variable=$2
            Value=$3
            ## 检测是否已存在该变量
            grep ".*export ${Variable}=" -q $FileConfUser
            if [ $? -eq 0 ]; then
                echo -e "\n${BLUE}检测到已存在该环境变量：${PLAIN}\n$(grep -n ".*export ${Variable}=" $FileConfUser | sed "s|^|第|g; s|:|行：|g")"
                echo -e "\n$ERROR 环境变量 ${BLUE}${Variable}${PLAIN} 已经存在，请重新确认！"
            else
                case $# in
                3)
                    add_environment_variable "${Variable}" "${Value}" "添加时间：$(date "+%Y-%m-%d %T")"
                    ;;
                4)
                    add_environment_variable "${Variable}" "${Value}" "$4"
                    ;;
                esac
            fi
            ;;
        esac
        ;;

    ## 删除变量
    del)
        case $# in
        1)
            read -p "$(echo -e "\n${BOLD}└ 请输入需要删除的环境变量名称：${PLAIN}")" Variable
            VariableNums=$(grep -c ".*export ${Variable}=" $FileConfUser | head -n 1)
            local VariableTmp=$(grep -n ".*export ${Variable}=" $FileConfUser | sed "s|^|第|g; s|:|行：|g")
            if [[ ${VariableNums} -ne "0" ]]; then
                if [[ ${VariableNums} -gt "1" ]]; then
                    echo -e "\n${BLUE}检测到多个环境变量：${PLAIN}\n${VariableTmp}"
                elif [[ ${VariableNums} -eq "1" ]]; then
                    echo -e "\n${BLUE}检测到环境变量：${PLAIN}\n${VariableTmp}"
                fi
                while true; do
                    read -p "$(echo -e "\n${BOLD}└ 是否确认删除? [Y/n] ${PLAIN}")" Input1
                    [ -z ${Input1} ] && Input1=Y
                    case ${Input1} in
                    [Yy] | [Yy][Ee][Ss])
                        FullContent="$(grep ".*export ${Variable}=" $FileConfUser)"
                        sed -i "/export ${Variable}=/d" $FileConfUser
                        if [[ ${VariableNums} -gt "1" ]]; then
                            echo -e "\n$(echo -e "${FullContent}" | sed "s|^|\033[41;37m|g; s|$|\033[0m|g" | sed '$d')"
                        elif [[ ${VariableNums} -eq "1" ]]; then
                            echo -e "\n${RED}-${PLAIN} \033[41;37m${FullContent}${PLAIN}"
                        fi
                        echo -e "\n$COMPLETE 环境变量已删除\n"
                        break
                        ;;
                    [Nn] | [Nn][Oo])
                        echo -e "\n$COMPLETE 结束，未做任何更改\n"
                        break
                        ;;
                    *)
                        echo -e "\n${YELLOW}----- 输入错误 -----${PLAIN}"
                        ;;
                    esac
                done
            else
                echo -e "\n$ERROR 在配置文件中未检测到 ${BLUE}${Variable}${PLAIN} 环境变量，请重新确认！\n"
            fi
            ;;
        2)
            Variable=$2
            ## 检测是否已存在该变量
            VariableNums=$(grep -c ".*export ${Variable}=" $FileConfUser | head -n 1)
            if [[ ${VariableNums} -ne "0" ]]; then
                FullContent="$(grep ".*export ${Variable}=" $FileConfUser)"
                sed -i "/export ${Variable}=/d" $FileConfUser
                if [[ ${VariableNums} -gt "1" ]]; then
                    echo -e "\n$(echo -e "${FullContent}" | sed "s|^|\033[41;37m|g; s|$|\033[0m|g" | sed '$d')"
                elif [[ ${VariableNums} -eq "1" ]]; then
                    echo -e "\n${RED}-${PLAIN} \033[41;37m${FullContent}${PLAIN}"
                fi
                echo -e "\n$COMPLETE 环境变量 ${BLUE}${Variable}${PLAIN} 已删除\n"
            else
                echo -e "\n$ERROR 在配置文件中未检测到 ${BLUE}${Variable}${PLAIN} 环境变量，请重新确认！\n"
            fi
            ;;
        esac
        ;;

    ## 修改变量
    edit)
        case $# in
        1)
            read -p "$(echo -e "\n${BOLD}└ 请输入需要修改的环境变量名称：${PLAIN}")" Variable
            ## 检测是否存在该变量
            grep ".*export.*=" $FileConfUser | grep ".*export ${Variable}=" -q
            if [ $? -eq 0 ]; then
                echo -e "\n${BLUE}当前环境变量：${PLAIN}\n$(grep -n ".*export ${Variable}=" $FileConfUser | sed "s|^|第|g; s|:|行：|g")\n"
                echo -e '1)  启用或禁用'
                echo -e '2)  修改变量的值'
                while true; do
                    read -p "$(echo -e "\n${BOLD}└ 请选择操作模式 [ 1-2 ]：${PLAIN}")" Input1
                    case ${Input1} in
                    1)
                        control_environment_variable "${Variable}"
                        break
                        ;;
                    2)
                        edit_environment_variable "${Variable}"
                        break
                        ;;
                    esac
                    echo -e "\n$ERROR 输入错误！"
                done
            else
                echo -e "\n$ERROR 在配置文件中未检测到 ${BLUE}${Variable}${PLAIN} 环境变量，请重新确认！\n"
            fi
            ;;
        3 | 4)
            case $2 in
            enable | disable)
                Variable=$3
                if [ $EXITSTATUS -eq 0 ]; then
                    control_environment_variable "$2" "${Variable}"
                else
                    echo -e "\n$ERROR 在配置文件中未检测到 ${BLUE}${Variable}${PLAIN} 环境变量，请重新确认！\n"
                fi
                ;;
            *)
                Variable=$2
                Value=$3
                grep ".*export.*=" $FileConfUser | grep ".*export ${Variable}=" -q
                local EXITSTATUS=$?
                case $# in
                3)
                    if [ $EXITSTATUS -eq 0 ]; then
                        edit_environment_variable "${Variable}" "${Value}"
                    else
                        echo -e "\n$WARN 由于未检测到该环境变量因此将自动添加"
                        add_environment_variable "${Variable}" "${Value}" "添加时间：$(date "+%Y-%m-%d %T")"
                    fi
                    ;;
                4)
                    if [ $EXITSTATUS -eq 0 ]; then
                        edit_environment_variable "${Variable}" "${Value}" "$4"
                    else
                        echo -e "\n$WARN 由于未检测到该环境变量因此将自动添加"
                        add_environment_variable "${Variable}" "${Value}" "添加时间：$(date "+%Y-%m-%d %T")"
                    fi
                    ;;
                esac
                ;;
            esac
            ;;
        esac
        ;;

    ## 查询变量
    search)
        case $# in
        1)
            read -p "$(echo -e "\n${BOLD}└ 请输入需要查询的关键词：${PLAIN}")" Keys
            ;;
        2)
            Keys=$2
            ;;
        esac
        ## 检测搜索结果是否为空
        grep ".*export.*=" $FileConfUser | grep "${Keys}" -q
        local EXITSTATUS=$?
        if [[ $EXITSTATUS -eq 0 ]]; then
            echo -e "\n${BLUE}检测到的环境变量：${PLAIN}"
            grep -n ".*export.*=" $FileConfUser | grep "${Keys}" | sed "s|^|第|g; s|:|行：|g; s|${Keys}|${RED}${Keys}${PLAIN}|g"
            echo -e "\n$COMPLETE 查询完毕\n"
        else
            echo -e "\n$COMPLETE 未查询到包含 ${BLUE}${Keys}${PLAIN} 内容的相关环境变量！\n"
        fi
        ;;
    esac
}

function command_envm() {
    case $# in
    0)
        print_command_help envm
        ;;
    1)
        case $1 in
        add | del | edit | search)
            handle_environment_variable $1
            ;;
        *)
            output_command_error 1 # 命令错误
            ;;
        esac
        ;;
    2)
        case $1 in
        enable | disable)
            handle_environment_variable "edit" $1 $2
            ;;
        del | search)
            handle_environment_variable $1 $2
            ;;
        *)
            output_command_error 1 # 命令错误
            ;;
        esac
        ;;
    3)
        case $1 in
        add | edit)
            handle_environment_variable $1 $2 "$3"
            ;;
        *)
            output_command_error 1 # 命令错误
            ;;
        esac
        ;;
    4)
        case $1 in
        add | edit)
            handle_environment_variable $1 $2 "$3" "$4"
            ;;
        *)
            output_command_error 1 # 命令错误
            ;;
        esac
        ;;
    *)
        output_command_error 2 # 命令过多
        ;;
    esac
}
