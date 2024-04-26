#!/bin/bash
## Modified: 2024-04-25

## 列出本地代码文件清单功能
# list <path>
function command_list_main() {
    # 代码文件类型
    ScriptType="\.js\$|\.mjs\$|\.cjs\$|\.sh\$"
    if [ "$(command -v python3)" ]; then
        ScriptType="${ScriptType}|\.py\$"
    fi
    if [ "$(command -v ts-node)" ]; then
        ScriptType="${ScriptType}|\.ts\$"
    fi
    if [ "$(command -v go)" ]; then
        ScriptType="${ScriptType}|\.go\$"
    fi
    # 内置过滤规则
    MaskingScripts="index\.js"
    MaskingKeywords="sendNotify\.|\.bak\b|${MaskingScripts}"

    list_designated "$1"
    echo ''
}

## 列出指定目录下的代码文件
function list_designated() {
    local input_content work_dir tmp_pwd tmp_num tmp_length1 tmp_length2 tmp_spaces_nums1 tmp_script_modify_times
    ## 去掉传入参数中的最后一个/
    echo $1 | grep "/$" -q
    if [ $? -eq 0 ]; then
        input_content=${1%?}
    else
        input_content=$1
    fi
    ## 判断传入参数
    echo ${input_content} | grep "\/" -q
    if [ $? -eq 0 ]; then
        ## 判定传入的是绝对路径还是相对路径
        echo ${input_content} | grep "^$RootDir" -q
        if [ $? -eq 0 ]; then
            work_dir=${input_content}
        else
            ## 处理上级目录
            echo ${input_content} | grep "\.\./" -q
            if [ $? -eq 0 ]; then
                tmp_pwd=$(pwd | sed "s|/$(pwd | awk -F '/' '{printf$NF}')||g")
                work_dir=$(echo "${input_content}" | sed "s|\.\./|${tmp_pwd}/|g")
            else
                work_dir=$(echo "${input_content}" | sed "s|\.\/||g; s|^*|$(pwd)/|g")
            fi
        fi
    else
        if [[ "${input_content}" = "." ]]; then
            work_dir="$(pwd)"
        elif [[ "${input_content}" = "./" ]]; then
            work_dir="$(pwd)"
        else
            work_dir="$(pwd)/${input_content}"
        fi
    fi
    ## 判断路径是否存在
    if [ -d $work_dir ]; then
        if [ "$(ls -A $work_dir | grep -E "${ScriptType}")" = "" ]; then
            if [ "$(ls -A $work_dir)" = "" ]; then
                output_error "路径 ${BLUE}$work_dir${PLAIN} 为空！"
            else
                echo -e "\n$FAIL 在 ${BLUE}$work_dir${PLAIN} 路径下未检测到任何代码文件！\n"
                exit
            fi
        fi
    else
        output_error "目标路径 ${BLUE}$work_dir${PLAIN} 不存在，请重新确认！"
    fi

    cd $work_dir
    ## 打印仓库地址
    if [ -d .git ]; then
        local remote_url=$(git remote -v | head -n 1 | awk -F ' ' '{print$2}')
        echo "$remote_url" | grep "git@" -q
        if [ $? -ne 0 ]; then
            echo -e "\n❖ 远程仓库地址: ${BLUE}${remote_url%\.*}${PLAIN}"
        fi
    fi
    local files_list=(
        $(ls | grep -E "${ScriptType}" | grep -Ev "${MaskingKeywords}")
    )
    [ ${#files_list[*]} = 0 ] && exit ## 终止退出
    if [[ ${#files_list[*]} -ge "10" ]]; then
        if [[ ${#files_list[*]} -ge "100" ]]; then
            tmp_num="3"
        else
            tmp_num="2"
        fi
    else
        tmp_num="1"
    fi
    printf "\n${BLUE}%$((28 + ${tmp_num}))s${PLAIN} ${BLUE}%30s${PLAIN} ${BLUE}%6s${PLAIN}             ${BLUE}%s${PLAIN}\n" "[文件名称]" "[修改时间]" " [大小]" "[代码文件名称]"
    echo ''

    for ((i = 0; i < ${#files_list[*]}; i++)); do
        query_script_name ${files_list[i]}
        query_script_size ${files_list[i]}
        tmp_script_modify_times=query_script_modify_times ${files_list[i]}
        tmp_length1=$(string_length $(echo ${files_list[i]} | perl -pe '{s|[0-9a-zA-Z\,\.\=\:\_\-\(\)\[\]\<\>\~]||g;}'))
        tmp_spaces_nums1=$(($((34 - ${tmp_length1} - ${#files_list[i]})) / 2))
        for ((a = 1; a <= ${tmp_spaces_nums1}; a++)); do
            files_list[i]=" ${files_list[i]}"
        done
        tmp_length2=$(string_length $(echo ${ScriptName} | perl -pe '{s|[0-9a-zA-Z\,\.\=\:\_\-\(\)\[\]\<\>\~]||g;}'))
        tmp_spaces_nums2=$(($((34 - ${tmp_length2} - ${#ScriptName})) / 2))
        for ((a = 1; a <= ${tmp_spaces_nums2}; a++)); do
            ScriptName=" ${ScriptName}"
        done
        printf "%${tmp_num}s  %-$((34 + ${tmp_length1}))s %14s %6s  %-$((34 + ${tmp_length2}))s\n" "$(($i + 1))" "${files_list[i]}" "${tmp_script_modify_times}" "${ScriptSize}" "${ScriptName}"
    done
}

## 查询代码文件名，$1 为代码文件名
function query_script_name() {
    local file_name=$1
    local tmp_result
    case ${file_name##*.} in
    js)
        grep "\$ \=" $file_name | grep -Eiq ".*new Env\(.*\)"
        if [ $? -eq 0 ]; then
            tmp_result=$(grep "\$ \=" $file_name | grep -Ei ".*new Env\(.*\)" | head -1 | perl -pe "{s|.*nv\([\'\"](.*)[\'\"]\).*|\1|g}")
        else
            tmp_result=$(grep -w "script-path" $file_name | head -1 | sed "s/\W//g" | sed "s/[0-9a-zA-Z_]//g")
        fi
        ;;
    *)
        cat $file_name | sed -n "1,10p" | grep -Eiq ".*new Env\(.*\)"
        if [ $? -eq 0 ]; then
            tmp_result=$(grep "new Env(" $file_name | grep -Ei ".*new Env\(.*\)" | head -1 | perl -pe "{s|.*nv\([\'\"](.*)[\'\"]\).*|\1|g}")
        else
            tmp_result=$(grep -E "^代码文件名称" $file_name | head -1 | awk -F "[\'\":,：]" '{print $2}' | awk -F "[\'\":,：]" '{print $1}')
        fi
        ;;
    esac
    if [ "${tmp_result}" ]; then
        ScriptName=${tmp_result}
    else
        ScriptName="<未知>"
    fi
}

## 查询代码文件大小，$1 为代码文件名
function query_script_size() {
    local file_name=$1
    ScriptSize=$(ls -lth | grep "\b$file_name\b" | awk -F ' ' '{print$5}')
}

## 查询代码文件修改时间，$1 为代码文件名
function query_script_modify_times() {
    local file_name=$1
    local tmp_data=$(ls -lth | grep "\b$file_name\b" | awk -F 'root' '{print$NF}')
    local tmp_month=$(echo $tmp_data | awk -F ' ' '{print$2}')
    local month="$(echo '{"Jan": "1", "Feb": "2", "Mar": "3", "Apr": "4", "May": "5", "Jun": "6", "Jul": "7", "Aug": "8", "Sept": "9", "Oct": "10", "Nov": "11", "Dec": "12"}' | jq -r ".${tmp_month}")"
    local day=$(echo $tmp_data | awk -F ' ' '{print$3}')
    if [[ $day -lt "10" ]]; then
        day="0$day"
    fi
    local time=$(echo $tmp_data | awk -F ' ' '{print$4}')
    echo -e "$month-$day $time"
}

function command_list() {
    case $# in
    0)
        print_command_help list
        ;;
    1)
        command_list_main $1
        ;;
    *)
        output_command_error 2 # 命令过多
        ;;
    esac
}
