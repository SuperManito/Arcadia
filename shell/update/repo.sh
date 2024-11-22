#!/bin/bash
## Modified: 2024-11-22

## 更新所有仓库
# update repo
function update_all_repo() {
    ## 统计仓库数量并生成配置
    count_reposum
    gen_repoconf_array
    if [[ $RepoSum -lt 1 || ${#Array_Repo_url[*]} -lt 1 ]]; then
        echo -e "\n$TIP 未检测到任何有效的仓库配置，跳过更新仓库..."
    fi
    local name url branch path
    local authSettings authSettings_alias authSettings_hostName authSettings_privateKeyPath authSettings_username authSettings_password
    local updateTaskList scriptsPath scriptsType whiteList blackList autoDisable addNotify delNotify
    ## 遍历仓库配置数组
    for ((i = 0; i < ${#Array_Repo_url[*]}; i++)); do
        ## 判断仓库是否启用
        [[ -z "${Array_Repo_url[i]}" || -z "${Array_Repo_branch[i]}" ]] && continue
        [[ ${Array_Repo_enable[i]} == "false" ]] && continue

        ## 定义配置
        name="${Array_Repo_name[i]}"
        url="${Array_Repo_url[i]}"
        branch="${Array_Repo_branch[i]}"
        path="${Array_Repo_path[i]}"
        authSettings="${Array_Repo_authSettings[i]}"
        authSettings_alias="${Array_Repo_authSettings_alias[i]}"
        authSettings_hostName="${Array_Repo_authSettings_hostName[i]}"
        authSettings_privateKeyPath="${Array_Repo_authSettings_privateKeyPath[i]}"
        authSettings_username="${Array_Repo_authSettings_username[i]}"
        authSettings_password="${Array_Repo_authSettings_password[i]}"
        updateTaskList="${Array_Repo_cronSettings_updateTaskList[i]}"
        scriptsPath="${Array_Repo_cronSettings_scriptsPath[i]}"
        scriptsType="${Array_Repo_cronSettings_scriptsType[i]}"
        whiteList="${Array_Repo_cronSettings_whiteList[i]}"
        blackList="${Array_Repo_cronSettings_blackList[i]}"
        autoDisable="${Array_Repo_cronSettings_autoDisable[i]}"
        addNotify="${Array_Repo_cronSettings_addNotify[i]}"
        delNotify="${Array_Repo_cronSettings_delNotify[i]}"

        ## 更新/克隆仓库
        if [ -d "${path}/.git" ]; then
            # 生成旧的定时代码文件清单
            [[ "${updateTaskList}" == "true" ]] && gen_cron_task_list "old" "${path}" "${scriptsPath}" "${scriptsType}" "${whiteList}" "${blackList}" "${autoDisable}" "${addNotify}" "${delNotify}"

            if [[ "${authSettings}" == 'ssh' ]]; then
                reset_romote_url_with_ssh_auth "${authSettings_alias}" "${authSettings_hostName}" "${authSettings_privateKeyPath}" "${path}" "${url}"
            elif [[ "${authSettings}" == 'http' ]]; then
                reset_romote_url_with_http_auth "${authSettings_username}" "${authSettings_password}" "${path}" "${url}"
            else
                reset_romote_url "${path}" "${url}"
            fi
            git_pull "${path}" "${branch}"
            if [[ $EXITSTATUS -eq 0 ]]; then
                echo -e "\n$COMPLETE ${BLUE}${name}${PLAIN} 仓库更新完成"
            else
                echo -e "\n$FAIL ${BLUE}${name}${PLAIN} 仓库更新失败，请检查原因..."
            fi
        else
            if [[ "${authSettings}" == 'ssh' ]]; then
                git_clone_with_ssh_auth "${authSettings_alias}" "${authSettings_hostName}" "${authSettings_privateKeyPath}" "${url}" "${path}" "${branch}" "开始克隆仓库 ${BLUE}${name}${PLAIN}"
            elif [[ "${authSettings}" == 'http' ]]; then
                git_clone_with_http_auth "${authSettings_username}" "${authSettings_password}" "${url}" "${path}" "${branch}" "开始克隆仓库 ${BLUE}${name}${PLAIN}"
            else
                git_clone "${url}" "${path}" "${branch}" "开始克隆仓库 ${BLUE}${name}${PLAIN}"
            fi
            if [[ $EXITSTATUS -eq 0 ]]; then
                echo -e "\n$SUCCESS ${BLUE}${name}${PLAIN} 仓库克隆成功"
            else
                echo -e "\n$FAIL ${BLUE}${name}${PLAIN} 仓库克隆失败，请检查原因..."
                continue
            fi
        fi

        # 生成新的定时代码文件清单
        [[ "${updateTaskList}" == "true" ]] && gen_cron_task_list "new" "${path}" "${scriptsPath}" "${scriptsType}" "${whiteList}" "${blackList}" "${autoDisable}" "${addNotify}" "${delNotify}"
    done
}

## 更新指定路径下的仓库
# update <path>
function update_designated_repo() {
    ## 处理传入路径
    local repo_path pwd_tmp
    local input_content="$1"
    ## 转换为绝对路径
    repo_path="$(get_absolute_path "${input_content}")"
    ## 判定是否存在仓库
    if [ ! -d ${repo_path}/.git ]; then
        if [ -d ${repo_path} ]; then
            output_error "未检测到 ${BLUE}${repo_path}${PLAIN} 路径下存在任何仓库，请重新确认！"
        else
            output_error "未检测到 ${BLUE}${repo_path}${PLAIN} 路径不存在，请重新确认！"
        fi
    fi
    ## 更新源代码
    if [[ "${repo_path}" = "$RootDir" ]]; then
        echo -e "\n$WARN 请使用 ${GREEN}${ArcadiaCmd} update${PLAIN} 命令更新项目"
        return
    fi
    ## 更新仓库
    import core/sync
    import update/cron
    print_title_start "designated"
    make_dir $RepoDir $LogTmpDir
    count_reposum
    gen_repoconf_array
    ## 清空定时任务关联代码文件清单内容
    clean_list_scripts

    ## 判断仓库是否在配置文件中
    # 根据目标仓库是否为已配置的仓库
    local is_configured_repo="false" # 是否为已配置的仓库
    local name url branch path
    local authSettings authSettings_alias authSettings_hostName authSettings_privateKeyPath authSettings_username authSettings_password
    local updateTaskList scriptsPath scriptsType whiteList blackList autoDisable addNotify delNotify
    if [[ $RepoSum -ge 1 && ${#Array_Repo_url[*]} -ge 1 ]]; then
        for ((i = 0; i < ${#Array_Repo_url[*]}; i++)); do
            echo "${Array_Repo_path[i]}" | grep "${repo_path}" -q
            if [ $? -eq 0 ]; then
                is_configured_repo="true"
                ## 定义配置
                name="${Array_Repo_name[i]}"
                url="${Array_Repo_url[i]}"
                branch="${Array_Repo_branch[i]}"
                path="${Array_Repo_path[i]}"
                authSettings="${Array_Repo_authSettings[i]}"
                authSettings_alias="${Array_Repo_authSettings_alias[i]}"
                authSettings_hostName="${Array_Repo_authSettings_hostName[i]}"
                authSettings_privateKeyPath="${Array_Repo_authSettings_privateKeyPath[i]}"
                authSettings_username="${Array_Repo_authSettings_username[i]}"
                authSettings_password="${Array_Repo_authSettings_password[i]}"
                updateTaskList="${Array_Repo_cronSettings_updateTaskList[i]}"
                scriptsPath="${Array_Repo_cronSettings_scriptsPath[i]}"
                scriptsType="${Array_Repo_cronSettings_scriptsType[i]}"
                whiteList="${Array_Repo_cronSettings_whiteList[i]}"
                blackList="${Array_Repo_cronSettings_blackList[i]}"
                autoDisable="${Array_Repo_cronSettings_autoDisable[i]}"
                addNotify="${Array_Repo_cronSettings_addNotify[i]}"
                delNotify="${Array_Repo_cronSettings_delNotify[i]}"
                break
            fi
        done
    fi
    ## 非配置文件中的仓库
    if [ "${is_configured_repo}" != "true" ]; then
        git_pull "${repo_path}" $(grep "branch" ${repo_path}/.git/config | awk -F '\"' '{print$2}')
        if [[ $EXITSTATUS -eq 0 ]]; then
            echo -e "\n$COMPLETE 仓库更新完成"
        else
            echo -e "\n$FAIL 仓库更新失败，请检查原因..."
        fi
        return
    fi

    # 生成旧的定时代码文件清单
    [[ "${updateTaskList}" == "true" ]] && gen_cron_task_list "old" "${path}" "${scriptsPath}" "${scriptsType}" "${whiteList}" "${blackList}" "${autoDisable}" "${addNotify}" "${delNotify}"

    if [[ "${authSettings}" == 'ssh' ]]; then
        reset_romote_url_with_ssh_auth "${authSettings_alias}" "${authSettings_hostName}" "${authSettings_privateKeyPath}" "${path}" "${url}"
    elif [[ "${authSettings}" == 'http' ]]; then
        reset_romote_url_with_http_auth "${authSettings_username}" "${authSettings_password}" "${path}" "${url}"
    else
        reset_romote_url "${path}" "${url}"
    fi
    git_pull "${path}" "${branch}"
    if [[ $EXITSTATUS -eq 0 ]]; then
        echo -e "\n$COMPLETE ${BLUE}${name}${PLAIN} 仓库更新完成"
    else
        echo -e "\n$FAIL ${BLUE}${name}${PLAIN} 仓库更新失败，请检查原因..."
    fi

    # 生成新的定时代码文件清单
    [[ "${updateTaskList}" == "true" ]] && gen_cron_task_list "new" "${path}" "${scriptsPath}" "${scriptsType}" "${whiteList}" "${blackList}" "${autoDisable}" "${addNotify}" "${delNotify}"

    ## 更新定时任务
    update_cron
}
