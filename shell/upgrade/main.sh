#!/bin/bash

## 更新项目
function command_upgrade() {
    ## 创建日志文件夹
    make_dir $LogDir
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
                sync_prisma_schema || output_error "Prisma 初始化失败（客户端生成或数据库同步），请查看报错并分析原因！"
                pm2 start ecosystem.config.cjs
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
