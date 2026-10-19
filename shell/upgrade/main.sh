#!/bin/bash

## 更新项目
function command_upgrade() {
    make_dir $LogDir
    local log_file="${LogDir}/update-error-$(date "+%Y-%m-%d-%H-%M-%S").log"
    command_upgrade_main "${log_file}" 2>&1 | tee -a $log_file
}

function command_upgrade_main() {
    ## 导入配置文件（不检查）
    import_config_not_check

    ## 存储依赖清单
    local project_depend_old project_depend_new
    [ -f "${BackendDir}/package.json" ] && project_depend_old="$(cat "${BackendDir}/package.json")"

    cd $SrcDir
    local branch_name="$(git rev-parse --abbrev-ref HEAD)"
    echo -e "\n$WORKING 开始更新 ${BLUE}Arcadia${PLAIN}\n"
    export GIT_TERMINAL_PROMPT=0
    git fetch --all
    local upgrade_fetch_status=$?

    ## 判断源代码仓库是否变动
    local need_upgrade=0
    if [[ $upgrade_fetch_status -eq 0 ]] && [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/${branch_name} 2>/dev/null)" ]]; then
        need_upgrade=1
        ## 先停止服务，避免因 pm2 watch 机制自动重启
        pm2 delete arcadia_server >/dev/null 2>&1
    fi

    git reset --hard origin/${branch_name} 2>/dev/null
    local upgrade_status=1
    if [[ $upgrade_fetch_status -eq 0 ]] && [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/${branch_name})" ]]; then
        upgrade_status=0
    fi

    if [[ $upgrade_status -eq 0 ]]; then
        echo -e "\n$COMPLETE 已更新\n"

        if [[ $need_upgrade -eq 1 ]]; then
            ## 检测依赖是否变动
            [ -f "${BackendDir}/package.json" ] && project_depend_new="$(cat "${BackendDir}/package.json")"
            if [[ "${project_depend_old}" != "${project_depend_new}" ]]; then
                $ArcadiaCmd service start
            else
                if sync_prisma_schema; then
                    rm -f "$1"
                    pm2 start ecosystem.config.cjs
                else
                    $ArcadiaCmd service start
                fi
            fi
        fi
        ## 后端回调
        if [[ "${ARCADE_UPDATE_SOURCE}" != "backend" ]]; then
            curl -s -m 5 -X POST "http://127.0.0.1:5678/api/inner/update/refresh" >/dev/null 2>&1
        fi
    else
        echo -e "\n$FAIL 更新失败，请检查原因...\n"
        if [[ $need_upgrade -eq 1 ]]; then
            pm2 start ecosystem.config.cjs
        fi
    fi
}
