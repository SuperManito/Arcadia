#!/bin/bash
## Modified: 2025-05-05

## 统计代码仓库数量
function count_reposum() {
    cat $FileSyncConfUser | yq >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        RepoSum="$(cat $FileSyncConfUser | yq '.repo | length')"
    else
        output_error "配置文件 $FileSyncConfUser 存在语法错误，请检查后重试！"
    fi
}

## 统计远程文件数量
function count_rawconf_sum() {
    cat $FileSyncConfUser | yq >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        RawSum="$(cat $FileSyncConfUser | yq '.raw | length')"
    else
        output_error "配置文件 $FileSyncConfUser 存在语法错误，请检查后重试！"
    fi
}

# 读取配置
function get_conf() {
    echo "$1" | jq -rcM "$2"
}

## 生成用户代码仓库配置信息数组
# 代码仓库名称 Array_Repo_name
# 代码仓库远程地址 Array_Repo_url
# 代码仓库分支名称 Array_Repo_branch
# 代码仓库启用状态 Array_Repo_enable
# 代码仓库本地存放目录名称 Array_Repo_dir
# 代码仓库本地文件绝对路径 Array_Repo_path
# 私有仓库认证设置 - 认证类型 Array_Repo_authSettings
# 私有仓库认证设置 - SSH认证别名 Array_Repo_authSettings_alias
# 私有仓库认证设置 - SSH认证主机名 Array_Repo_authSettings_hostName
# 私有仓库认证设置 - SSH认证私钥路径 Array_Repo_authSettings_privateKeyPath
# 私有仓库认证设置 - HTTP认证用户名 Array_Repo_authSettings_username
# 私有仓库认证设置 - HTTP认证密码 Array_Repo_authSettings_password
# 代码仓库远程文件定时设置 - 定时任务启用状态 Array_Repo_cronSettings_updateTaskList
# 代码仓库远程文件定时设置 - 自动禁用新的定时任务 Array_Repo_cronSettings_autoDisable
# 代码仓库远程文件定时设置 - 新增定时任务推送通知提醒 Array_Repo_cronSettings_addNotify
# 代码仓库远程文件定时设置 - 过期定时任务推送通知提醒 Array_Repo_cronSettings_delNotify
# 代码仓库远程文件定时设置 - 远程文件过滤路径 Array_Repo_cronSettings_scriptsPath
# 代码仓库远程文件定时设置 - 远程文件过滤格式 Array_Repo_cronSettings_scriptsType
# 代码仓库远程文件定时设置 - 过滤白名单 Array_Repo_cronSettings_whiteList
# 代码仓库远程文件定时设置 - 过滤黑名单 Array_Repo_cronSettings_blackList
function gen_repoconf_array() {
    if [[ $RepoSum -lt 1 ]]; then
        return
    fi
    # 数据读取封装
    local json_data="$(yq -r '.repo' "$FileSyncConfUser" | jq -c .)"
    function get_config_wrapper() {
        get_conf "${json_data}" ".[${arr_index}] | .$1 // \"\""
    }

    ## 遍历 repo 配置
    local conf_index=0 # 注：有效的仓库配置数组索引
    local arr_index tmp_url tmp_branch tmp_authSettings_method tmp_sshConfig_alias tmp_sshConfig_hostName tmp_sshConfig_privateKeyPath tmp_httpAuth_username tmp_httpAuth_password
    for ((i = 1; i <= $RepoSum; i++)); do
        arr_index=$((i - 1))
        ## 代码仓库地址（如若未定义或格式错误则跳过视为无效配置）
        tmp_url="$(get_config_wrapper "url")"
        if [[ -z "${tmp_url}" ]]; then
            # echo -e "$WARN 未检测到第$(($arr_index + 1))个仓库配置的远程地址，跳过..."
            continue
        fi
        # 判断仓库地址格式
        echo "${tmp_url}" | grep -Eq "\.git$" # 链接必须以.git结尾
        if [ $? -ne 0 ]; then
            echo -e "$WARN 检测到第$(($conf_index + 1))个仓库配置的远程地址无效，跳过..."
            continue
        fi
        echo "${tmp_url}" | grep -Eq "https?:"
        if [ $? -ne 0 ]; then
            echo "${tmp_url}" | grep -Eq "^git\@"
            if [ $? -ne 0 ]; then
                echo -e "$WARN 检测到第$(($conf_index + 1))个仓库配置的远程地址无效"
                continue
            fi
        fi
        ## 代码仓库分支（如若未定义或格式错误则跳过视为无效配置）
        tmp_branch="$(get_config_wrapper "branch")"
        if [[ -z "${tmp_branch}" ]]; then
            # echo -e "$WARN 未检测到第$(($arr_index + 1))个仓库配置的分支名称，跳过..."
            continue
        fi
        Array_Repo_url[$conf_index]="${tmp_url}"
        Array_Repo_branch[$conf_index]="${tmp_branch}"
        ## 代码仓库名称（如若未定义则采用远程地址中的仓库名称）
        Array_Repo_name[$conf_index]="$(get_config_wrapper "name")"
        if [[ -z "${Array_Repo_name[conf_index]}" ]]; then
            Array_Repo_name[$conf_index]="$(echo ${Array_Repo_url[conf_index]} | sed "s|\.git||g" | awk -F "/|:" '{print$NF}')"
        fi
        ## 代码仓库路径
        Array_Repo_dir[$conf_index]="$(echo "${Array_Repo_url[conf_index]}" | sed "s|\.git||g" | awk -F "/|:" '{print $((NF - 1)) "_" $NF}')"
        Array_Repo_path[$conf_index]="$RepoDir/${Array_Repo_dir[conf_index]}"
        ## 代码仓库启用状态（默认启用）
        if [[ "$(get_config_wrapper "enable")" == "false" ]]; then
            Array_Repo_enable[$conf_index]="false"
        else
            Array_Repo_enable[$conf_index]="true"
        fi

        ## 私有仓库认证设置
        Array_Repo_authSettings[$conf_index]=""
        Array_Repo_authSettings_alias[$conf_index]=""
        Array_Repo_authSettings_hostName[$conf_index]=""
        Array_Repo_authSettings_privateKeyPath[$conf_index]=""
        Array_Repo_authSettings_username[$conf_index]=""
        Array_Repo_authSettings_password[$conf_index]=""
        if [[ "$(get_config_wrapper "isPrivate")" == "true" ]] && [[ "$(get_config_wrapper "authSettings.method")" != "null" ]]; then
            tmp_authSettings_method="$(get_config_wrapper "authSettings.method")"
            if [[ "${tmp_authSettings_method}" == "ssh" ]] && [[ "$(get_config_wrapper "authSettings.sshConfig")" ]]; then
                tmp_sshConfig_alias="$(get_config_wrapper "authSettings.sshConfig.alias")"
                tmp_sshConfig_hostName="$(get_config_wrapper "authSettings.sshConfig.hostName")"
                tmp_sshConfig_privateKeyPath="$(get_config_wrapper "authSettings.sshConfig.privateKeyPath")"
                if [[ "${tmp_authSettings_method}" ]] && [[ "${tmp_sshConfig_hostName}" ]] && [[ -s "${tmp_sshConfig_privateKeyPath}" ]]; then
                    Array_Repo_authSettings[$conf_index]="ssh"
                    Array_Repo_authSettings_alias[$conf_index]="${tmp_sshConfig_alias}"
                    Array_Repo_authSettings_hostName[$conf_index]="${tmp_sshConfig_hostName}"
                    Array_Repo_authSettings_privateKeyPath[$conf_index]="${tmp_sshConfig_privateKeyPath}"
                else
                    if [[ "${tmp_authSettings_method}" ]] && [[ "${tmp_sshConfig_hostName}" ]]; then
                        echo -e "$WARN 检测到第$(($conf_index + 1))个仓库配置的私钥不存在，跳过..."
                        Array_Repo_url[$conf_index]=""
                    else
                        echo -e "$WARN 检测到第$(($conf_index + 1))个仓库配置的 SSH 配置存在错误，跳过..."
                        Array_Repo_url[$conf_index]=""
                    fi
                fi
            elif [[ "${tmp_authSettings_method}" == "http" ]] && [[ "$(get_config_wrapper "authSettings.httpAuth")" ]]; then
                tmp_httpAuth_username="$(get_config_wrapper "authSettings.httpAuth.username")"
                tmp_httpAuth_password="$(get_config_wrapper "authSettings.httpAuth.password")"
                if [[ "${tmp_httpAuth_username}" ]] && [[ "${tmp_httpAuth_password}" ]]; then
                    Array_Repo_authSettings[$conf_index]="http"
                    Array_Repo_authSettings_username[$conf_index]="${tmp_httpAuth_username}"
                    Array_Repo_authSettings_password[$conf_index]="${tmp_httpAuth_password}"
                else
                    echo -e "$WARN 检测到第$(($conf_index + 1))个仓库配置的HTTP认证设置存在错误，跳过..."
                    Array_Repo_url[$conf_index]=""
                fi
            fi
        fi

        ## 定时任务设置
        # 定时启用状态（默认禁用）
        if [[ "$(get_config_wrapper "cronSettings.updateTaskList")" == "true" ]]; then
            Array_Repo_cronSettings_updateTaskList[$conf_index]="true"
        else
            Array_Repo_cronSettings_updateTaskList[$conf_index]="false"
        fi
        # 定时远程文件路径（如若未定义则默认为'/'，表示根目录）
        if [[ -z "$(get_config_wrapper "cronSettings.scriptsPath")" ]]; then
            Array_Repo_cronSettings_scriptsPath[$conf_index]="/"
        else
            Array_Repo_cronSettings_scriptsPath[$conf_index]="$(get_config_wrapper "cronSettings.scriptsPath")"
        fi
        # 定时远程文件类型（如若未定义则默认为js、py、ts）
        if [[ "$(get_config_wrapper "cronSettings.scriptsType | arrays")" ]]; then
            Array_Repo_cronSettings_scriptsType[$conf_index]="js py ts"
        else
            Array_Repo_cronSettings_scriptsType[$conf_index]="$(get_config_wrapper "cronSettings.scriptsType | arrays" | jq -r 'join(" ")')"
        fi
        # 定时远程文件白名单（如若未定义则默认为空）
        if [[ -z "$(get_config_wrapper "cronSettings.whiteList")" ]]; then
            Array_Repo_cronSettings_whiteList[$conf_index]=""
        else
            Array_Repo_cronSettings_whiteList[$conf_index]="$(get_config_wrapper "cronSettings.whiteList")"
        fi
        # 定时远程文件黑名单（如若未定义则默认为空）
        if [[ -z "$(get_config_wrapper "cronSettings.blackList")" ]]; then
            Array_Repo_cronSettings_blackList[$conf_index]=""
        else
            Array_Repo_cronSettings_blackList[$conf_index]="$(get_config_wrapper "cronSettings.blackList")"
        fi
        # 自动禁用新的定时任务（默认禁用）
        if [[ "$(get_config_wrapper "cronSettings.autoDisable")" == "true" ]]; then
            Array_Repo_cronSettings_autoDisable[$conf_index]="true"
        else
            Array_Repo_cronSettings_autoDisable[$conf_index]="false"
        fi
        # 新增定时任务推送通知提醒（默认启用）
        if [[ "$(get_config_wrapper "cronSettings.addNotify")" == "false" ]]; then
            Array_Repo_cronSettings_addNotify[$conf_index]="false"
        else
            Array_Repo_cronSettings_addNotify[$conf_index]="true"
        fi
        # 过期定时任务推送通知提醒（默认启用）
        if [[ "$(get_config_wrapper "cronSettings.delNotify")" == "false" ]]; then
            Array_Repo_cronSettings_delNotify[$conf_index]="false"
        else
            Array_Repo_cronSettings_delNotify[$conf_index]="true"
        fi

        # echo "
        # 第$(($conf_index + 1))个代码仓库的配置：
        # name: ${Array_Repo_name[conf_index]:-"无"}
        # url: ${Array_Repo_url[conf_index]:-"无"}
        # branch: ${Array_Repo_branch[conf_index]:-"无"}
        # enable: ${Array_Repo_enable[conf_index]:-"无"}
        # dir: ${Array_Repo_dir[conf_index]:-"无"}
        # path: ${Array_Repo_path[conf_index]:-"无"}
        # updateTaskList: ${Array_Repo_cronSettings_updateTaskList[conf_index]:-"无"}
        # scriptsPath: ${Array_Repo_cronSettings_scriptsPath[conf_index]:-"无"}
        # scriptsType: ${Array_Repo_cronSettings_scriptsType[conf_index]:-"无"}
        # whiteList: ${Array_Repo_cronSettings_whiteList[conf_index]:-"无"}
        # blackList: ${Array_Repo_cronSettings_blackList[conf_index]:-"无"}
        # autoDisable: ${Array_Repo_cronSettings_autoDisable[conf_index]:-"无"}
        # addNotify: ${Array_Repo_cronSettings_addNotify[conf_index]:-"无"}
        # delNotify: ${Array_Repo_cronSettings_delNotify[conf_index]:-"无"}
        # "

        let conf_index++
    done
}

## 生成用户远程文件配置信息数组
# 远程文件名称（用户定义） Array_Raw_name
# 远程文件名称（文件名） Array_Raw_fileName
# 远程文件远程地址 Array_Raw_url
# 远程文件路径 Array_Raw_path
# 远程文件启用状态 Array_Raw_enable
# 远程文件定时设置 - 定时任务启用状态 Array_Raw_cronSettings_updateTaskList
function gen_rawconf_array() {
    if [[ $RawSum -lt 1 ]]; then
        return
    fi
    # 数据读取封装
    local json_data="$(yq -r '.raw' "$FileSyncConfUser" | jq -c .)"
    function get_config_wrapper() {
        get_conf "${json_data}" ".[${arr_index}] | .$1 // \"\""
    }

    import utils/request

    ## 遍历 raw 配置
    local conf_index=0 # 注：有效的仓库配置数组索引
    local arr_index tmp_url json_data
    for ((i = 1; i <= $RawSum; i++)); do
        arr_index=$((i - 1))
        ## 远程文件地址（如若未定义或格式错误则跳过视为无效配置）
        tmp_url="$(get_config_wrapper "url")"
        if [[ -z "${tmp_url}" ]]; then
            # echo -e "$ERROR 未检测到第$(($arr_index + 1))个远程文件配置的远程地址，跳过..."
            continue
        fi
        Array_Raw_url[$conf_index]="${tmp_url}"
        Array_Raw_path[$conf_index]="${RawDir}/${Array_Raw_url[conf_index]##*/}"
        ## 远程文件启用状态（默认启用）
        if [[ "$(get_config_wrapper "enable")" == "false" ]]; then
            Array_Raw_enable[$conf_index]="false"
        else
            Array_Raw_enable[$conf_index]="true"
        fi
        ## 代码仓库原始文件地址自动纠正
        if [[ "$(get_correct_raw_url "${Array_Raw_url[conf_index]}")" ]]; then
            Array_Raw_url[$conf_index]="$(get_correct_raw_url "${Array_Raw_url[conf_index]}")"
        fi
        ## 远程文件名称（如若未定义则采用远程地址中的远程文件名称）
        Array_Raw_fileName[$conf_index]="${Array_Raw_url[conf_index]##*/}"
        if [[ -z "$(get_config_wrapper "name")" ]]; then
            Array_Raw_name[$conf_index]="${Array_Raw_fileName[conf_index]}"
        else
            Array_Raw_name[$conf_index]="$(get_config_wrapper "name")"
        fi
        # 定时启用状态（默认禁用）
        if [[ "$(get_config_wrapper "cronSettings.updateTaskList")" == "true" ]]; then
            Array_Raw_cronSettings_updateTaskList[$conf_index]="true"
        else
            Array_Raw_cronSettings_updateTaskList[$conf_index]="false"
        fi

        # echo -e "
        # 第$(($conf_index + 1))个远程文件的配置：
        # name: ${Array_Raw_name[conf_index]:-"无"}
        # url: ${Array_Raw_url[conf_index]:-"无"}
        # path: ${Array_Raw_path[conf_index]:-"无"}
        # fileName: ${Array_Raw_fileName[conf_index]:-"无"}
        # updateTaskList: ${Array_Raw_cronSettings_updateTaskList[conf_index]:-"无"}
        # "

        let conf_index++
    done
}

## 生成定时任务远程文件的绝对路径清单
function gen_cron_task_list() {

    ## 生成远程文件清单对应的配置（部分用于在更新定时请求时携带）
    function gen_script_listconf() {
        echo "$(cat $ListConfScripts | jq '."'"$1"'"='"$2"'')" >$ListConfScripts
    }

    local current_dir=$(pwd)
    # 生成模式
    case "$1" in
    "old")
        local writeFile="$ListOldScripts"
        ;;
    "new")
        local writeFile="$ListNewScripts"
        ;;
    esac
    # 代码仓库路径
    local repoPath="$2"
    local repoDir="${repoPath##*/}"
    # 远程文件路径
    local scriptsPath="$3"
    # 远程文件类型
    local scriptsType="$4"
    local scriptsTypeMatch type
    if [[ "${scriptsType}" ]]; then
        for type in ${scriptsType}; do
            if [[ "${scriptsTypeMatch}" ]]; then
                scriptsTypeMatch="${scriptsTypeMatch}|\.${type}$"
            else
                scriptsTypeMatch="\.${type}$"
            fi
        done
    else
        scriptsTypeMatch=""
    fi
    # 过滤白名单
    local whiteList="$5"
    # 过滤黑名单
    local blackList="$6"
    # 自动禁用新的定时任务
    local autoDisable="$7"
    # 新增定时任务推送通知提醒
    local addNotify="$8"
    # 过期定时任务推送通知提醒
    local delNotify="$9"

    # echo "仓库 ${repoPath} 白名单：${whiteList:-"未定义"}"
    # echo "仓库 ${repoPath} 黑名单：${blackList:-"未定义"}"

    ## 远程文件路径
    # echo "仓库 ${repoPath} 远程文件路径：${scriptsPath:-"未定义"}"

    local Matching
    ## 仅根目录
    if [[ "${scriptsPath}" == "/" ]]; then
        ## 进入仓库根目录
        cd $repoPath
        ## 判断路径下是否存在远程文件
        if [[ "$(ls | grep -E "${scriptsTypeMatch}")" ]]; then
            ## 判断是否定义了黑名单并筛选符合条件的远程文件
            if [[ -z "${blackList}" ]]; then
                Matching=$(ls | grep -E "${scriptsTypeMatch}" 2>/dev/null | grep -E "${whiteList}")
            else
                Matching=$(ls | grep -E "${scriptsTypeMatch}" 2>/dev/null | grep -E "${whiteList}" | grep -Ev ${blackList})
            fi
            for file in ${Matching}; do
                ## 判断远程文件是否存在内容
                if [ -s $file ]; then
                    echo "${repoPath}/${file}" >>$writeFile
                    gen_script_listconf "${repoPath}/${file}" '{"path": "'"${repoPath}"'/'"${file}"'", "autoDisable": "'"${autoDisable}"'", "addNotify": "'"${addNotify}"'", "delNotify": "'"${delNotify}"'"}'
                else
                    continue
                fi
            done
        fi
    else
        local FormatPath path
        for path in ${scriptsPath}; do
            # echo "仓库 $((i + 1)) 循环处理路径: $path"
            ## 进入仓库根目录
            cd $repoPath
            ## 判断路径
            if [[ "${path}" == '/' ]]; then
                FormatPath="${Array_Repo_path[i]}" # 根目录
            else
                FormatPath="$RepoDir/$(echo "${repoDir}/$path" | sed "s|//|/|g; s|/$||g")" # 去掉多余的斜杠
                ## 判断子目录是否存在
                if [ -d "${FormatPath}" ]; then
                    cd ${FormatPath}
                else
                    echo -e "\n$ERROR 代码仓库 $((i + 1)) 的定时远程文件配置路径 ${BLUE}${FormatPath}${PLAIN} 不存在，跳过！\n"
                    continue
                fi
            fi
            ## 判断路径下是否存在远程文件
            if [[ "$(ls | grep -E "${scriptsTypeMatch}")" ]]; then
                ## 判断是否定义了黑名单并筛选符合条件的远程文件
                if [[ -z ${blackList} ]]; then
                    Matching=$(ls | grep -E "${scriptsTypeMatch}" 2>/dev/null | grep -E "${whiteList}")
                else
                    Matching=$(ls | grep -E "${scriptsTypeMatch}" 2>/dev/null | grep -E "${whiteList}" | grep -Ev ${blackList})
                fi
                for file in ${Matching}; do
                    ## 判断远程文件是否存在内容
                    if [ -s $file ]; then
                        echo "${FormatPath}/${file}" >>$writeFile
                        gen_script_listconf "${FormatPath}/${file}" '{"path": "'"${FormatPath}"'/'"${file}"'", "autoDisable": "'"${autoDisable}"'", "addNotify": "'"${addNotify}"'", "delNotify": "'"${delNotify}"'"}'
                    else
                        continue
                    fi
                done
            else
                continue
            fi
        done
    fi
    ## 汇总去重
    if [ -s $writeFile ]; then
        echo "$(sort -u $writeFile 2>/dev/null)" >$writeFile
    fi

    cd $current_dir
}
