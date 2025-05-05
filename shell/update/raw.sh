#!/bin/bash
## Modified: 2025-05-05

## 更新所有 Raw 代码文件
# update raw
function update_raw() {

    # 读取代码文件同步全局配置
    function get_globalconf() {
        cat $FileSyncConfUser | yq '.global' | jq -rc "$1"
    }

    ## 生成代码文件清单对应的配置（部分用于在更新定时请求时携带）
    function gen_script_listconf() {
        echo "$(cat $ListConfScripts | jq '."'"$1"'"='"$2"'')" >$ListConfScripts
    }

    local RemoveMark
    ## 统计远程文件数量并生成配置
    count_rawconf_sum
    gen_rawconf_array

    if [[ $RawSum -ge 1 && ${#Array_Raw_url[*]} -ge 1 ]]; then
        ## 定义依赖文件过滤（白名单）
        if [[ "$(get_globalconf ".rawDependencyFilter")" ]]; then
            local filter="node_modules|$(get_globalconf ".rawDependencyFilter")"
        else
            local filter="node_modules"
        fi
        ## 遍历远程文件配置数组，更新并生成新的定时文件清单
        for ((i = 0; i < ${#Array_Raw_url[*]}; i++)); do
            ## 判断文件是否启用
            [[ -z "${Array_Raw_url[i]}" ]] && continue
            [[ ${Array_Raw_enable[i]} == "false" ]] && continue

            if [[ ${Array_Raw_cronSettings_updateTaskList[i]} == "true" ]]; then
                [ -f "${Array_Raw_path[i]}" ] && echo "${Array_Raw_path[i]}" >>$ListOldScripts
            fi
            echo "${Array_Raw_url[i]}" | grep -Eq "github|gitee|gitlab|gitcode"
            if [ $? -eq 0 ]; then
                echo ${Array_Raw_url[i]} | grep -E "git.*\.io/" -q
                if [ $? -eq 0 ]; then
                    echo -e "\n$WORKING 开始从网站下载 ${BLUE}${Array_Raw_fileName[i]}${PLAIN} 代码文件..."
                else
                    echo -e "\n$WORKING 开始从仓库下载 ${BLUE}${Array_Raw_fileName[i]}${PLAIN} 代码文件..."
                fi
                wget -q --no-check-certificate -O "$RawDir/${Array_Raw_fileName[i]}.new" "${Array_Raw_url[i]}" -T 30
            else
                echo -e "\n$WORKING 开始从网站下载 ${BLUE}${Array_Raw_fileName[i]}${PLAIN} 代码文件..."
                wget -q --no-check-certificate -O "$RawDir/${Array_Raw_fileName[i]}.new" "${Array_Raw_url[i]}" -T 30
            fi
            if [ $? -eq 0 ]; then
                mv -f "$RawDir/${Array_Raw_fileName[i]}.new" "$RawDir/${Array_Raw_fileName[i]}"
                echo -e "$COMPLETE ${Array_Raw_name[i]} 下载完成，代码文件保存路径：$RawDir/${Array_Raw_fileName[i]}"
            else
                if [ -f "$RawDir/${Array_Raw_fileName[i]}" ]; then
                    echo -e "$FAIL ${Array_Raw_name[i]} 下载异常，保留之前正常下载的版本...\n"
                else
                    echo -e "$FAIL ${Array_Raw_name[i]} 下载异常，请检测链接有效性...\n"
                fi
                [ -f "$RawDir/${Array_Raw_fileName[i]}.new" ] && rm -f "$RawDir/${Array_Raw_fileName[i]}.new"
            fi

            if [[ ${Array_Raw_cronSettings_updateTaskList[i]} == "true" ]]; then
                echo "${Array_Raw_path[i]}" >>$ListNewScripts
                gen_script_listconf "${Array_Raw_path[i]}" '{"path": "'"${Array_Raw_path[i]}"'", "autoDisable": "false", "addNotify": "false", "delNotify": "false"}'
            fi
        done
        ## 清理 raw 目录下无关的文件
        if [[ $(ls $RawDir 2>/dev/null | grep -Ev "${filter}") ]]; then
            for file in $(ls $RawDir 2>/dev/null | grep -Ev "${filter}"); do
                RemoveMark="yes"
                for ((i = 0; i < ${#Array_Raw_url[*]}; i++)); do
                    if [[ $file == "${Array_Raw_fileName[i]}" ]]; then
                        RemoveMark="no"
                        break
                    fi
                done
                [[ $RemoveMark == yes ]] && rm -f $RawDir/$file 2>/dev/null
            done
        fi
    else
        echo -e "\n$TIP 未检测到任何有效的远程文件配置，跳过更新远程文件..."
    fi
}
