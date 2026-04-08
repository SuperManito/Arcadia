#!/bin/bash

## 更新项目
function command_upgrade() {
    import update/git
    ## 创建日志文件夹
    make_dir $LogDir
    ## 导入配置文件（不检查）
    import_config_not_check

    local project_depend_old project_depend_new
    ## 更新前先存储 package.json
    [ -f "${BackendDir}/package.json" ] && project_depend_old="$(cat "${BackendDir}/package.json")"
    ## 确认分支名称
    cd $SrcDir
    local src_branch_name="$(git status | head -n 1 | awk -F ' ' '{print$NF}')"
    cd $RootDir
    ## 更新仓库
    git_pull $SrcDir "${src_branch_name}" "Arcadia 源代码"
    if [[ $EXITSTATUS -eq 0 ]]; then
        echo -e "\n$COMPLETE 已更新\n"
    else
        echo -e "\n$FAIL 更新失败，请检查原因...\n"
    fi
    ## 检测依赖变动
    [ -f "${BackendDir}/package.json" ] && project_depend_new="$(cat "${BackendDir}/package.json")"
    if [[ "${project_depend_old}" != "${project_depend_new}" ]]; then
        # node-pty build dependency
        echo "${project_depend_old}" | grep "node-pty" -q
        local ExitStatusPty=$?
        echo "${project_depend_new}" | grep "node-pty" -q
        local ExitStatusPtyNew=$?
        if [[ ${ExitStatusPty} -ne 0 ]] && [[ ${ExitStatusPtyNew} -eq 0 ]]; then
            apt-get install -y make build-essential
            pm2 delete arcadia_ttyd >/dev/null 2>&1
        fi

        pm2 delete arcadia_server >/dev/null 2>&1
        $ArcadiaCmd service start
    fi
}
