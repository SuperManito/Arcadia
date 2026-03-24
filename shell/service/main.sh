#!/bin/bash

## 后端服务控制
# service start/restart/stop/respwd
function service_manage() {

    ## 安装后端依赖
    function install_dependencies() {
        cd $BackendDir
        npm install --omit=dev
    }

    local ServiceStatus
    pm2_list_all_services
    cat $FilePm2List | awk -F '|' '{print$3}' | grep "arcadia_server" -wq
    local ExitStatusSERVER=$?
    case $1 in
    ## 开启/重启服务
    start | restart)
        ## 禁用 Core Dump
        ulimit -c 0 >/dev/null 2>&1
        ## 删除日志
        rm -rf /root/.pm2/logs/arcadia_server-*.log
        if [[ ${ExitStatusSERVER} -eq 0 ]]; then
            local ServiceStatus=$(cat $FilePm2List | grep "arcadia_server" -w | awk -F '|' '{print$10}')
            case ${ServiceStatus} in
            online)
                pm2 restart arcadia_server
                echo -e "\n$COMPLETE 后台管理面板已重启\n"
                ;;
            stopped)
                pm2 start arcadia_server
                echo -e "\n$COMPLETE 后台管理面板已重新启动\n"
                ;;
            errored)
                echo -e "\n$WARN 检测到服务状态异常，开始尝试修复...\n"
                pm2 delete arcadia_server
                install_dependencies
                cd $SrcDir
                pm2 start ecosystem.config.cjs && sleep 3
                pm2_list_all_services
                local ServiceNewStatus=$(cat $FilePm2List | grep "arcadia_server" -w | awk -F '|' '{print$10}')
                if [[ "${ServiceNewStatus}" == "online" ]]; then
                    echo -e "\n$SUCCESS 已修复错误，服务恢复正常运行！\n"
                else
                    echo -e "\n$FAIL 未能自动修复错误，请检查原因后重试！\n"
                fi
                ;;
            esac
        else
            install_dependencies
            cd $SrcDir
            pm2 start ecosystem.config.cjs && sleep 1
            pm2_list_all_services
            local ServiceStatus=$(cat $FilePm2List | grep "arcadia_server" -w | awk -F '|' '{print$10}')
            if [[ ${ServiceStatus} == "online" ]]; then
                echo -e "\n$SUCCESS 后台管理面板已启动\n"
            else
                echo -e "\n$FAIL 后台管理面板启动失败，请检查原因后重试！\n"
            fi
        fi
        ;;
    ## 关闭服务
    stop)
        if [[ ${ExitStatusSERVER} -eq 0 ]]; then
            pm2 stop arcadia_server >/dev/null 2>&1
            pm2 list
            echo -e "\n$COMPLETE 后台管理服务已关闭\n"
        else
            echo -e "\n$ERROR 服务不存在！\n"
        fi
        ;;
    ## 重置密码
    respwd)
        local res="$(curl -s -X POST "http://127.0.0.1:5678/api/inner/user/resetPwd")"
        if [[ "$(echo "${res}" | jq -r '.code')" != "1" ]]; then
            echo -e "\n$ERROR 用户名和密码重置失败 => $(echo "${res}" | jq -r '.message')\n"
            return
        fi
        local result="$(echo "${res}" | jq -rc '.result')"
        local username="$(echo "${result}" | jq -r ".username")"
        local password="$(echo "${result}" | jq -r ".password")"
        echo -e "\n$COMPLETE 已重置用户名和密码\n\n[用户名]：${username}\n[密  码]：${password}\n"
        ;;
    esac
    ## 删除 PM2 进程日志清单
    [ -f $FilePm2List ] && rm -rf $FilePm2List
}

## 列出各服务状态
function service_status() {
    local Services ServiceName StatusJudge Status CreateTime CPUOccupancy MemoryOccupancy RunTime
    local SERVICE_ONLINE="${GREEN}正在运行${PLAIN}"
    local SERVICE_STOPPED="${YELLOW}未在运行${PLAIN}"
    local SERVICE_ERRORED="${RED}服务异常${PLAIN}"
    echo ''
    pm2 list
    echo ''
    pm2_list_all_services
    Services="arcadia_server tgbot"
    for Name in ${Services}; do
        ServiceName=''
        StatusJudge=''
        Status=''
        CreateTime=''
        CPUOccupancy=''
        MemoryOccupancy=''
        RunTime=''
        cat $FilePm2List | awk -F '|' '{print$3}' | grep ${Name} -wq
        if [ $? -eq 0 ]; then
            StatusJudge=$(cat $FilePm2List | grep ${Name} | awk -F '|' '{print $10}')
            case $StatusJudge in
            online)
                Status=$SERVICE_ONLINE
                ;;
            stopped)
                Status=$SERVICE_STOPPED
                ;;
            errored)
                Status=$SERVICE_ERRORED
                ;;
            esac
            CreateTime="${BLUE}$(date --date "$(pm2 describe ${Name} | grep "created at" | awk '{print $5}')")${PLAIN}"
            CPUOccupancy="${BLUE}$(cat $FilePm2List | grep ${Name} | awk -F '|' '{print $11}')${PLAIN}"
            MemoryOccupancy="${BLUE}$(cat $FilePm2List | grep ${Name} | awk -F '|' '{print $12}')${PLAIN}"
            RunTime="${BLUE}$(cat $FilePm2List | grep ${Name} | awk -F '|' '{print $8}')${PLAIN}"
        else
            Status=$SERVICE_STOPPED
            CreateTime="${BLUE}          No Data           ${PLAIN}"
            CPUOccupancy="${BLUE}No Data${PLAIN}"
            MemoryOccupancy="${BLUE}No Data${PLAIN}"
            RunTime="${BLUE}No Data${PLAIN}"
        fi
        case ${Name} in
        arcadia_server)
            ServiceName="[后  端  服  务]"
            ;;
        tgbot)
            ServiceName="[ Telegram Bot ]"
            ;;
        esac
        echo -e " $ServiceName：$Status       [创建时间]：$CreateTime       [资源占用]：$CPUOccupancy / $MemoryOccupancy / $RunTime"
    done
    ## 删除 PM2 进程日志清单
    [ -f $FilePm2List ] && rm -rf $FilePm2List
    echo ''
}

## 生成 pm2 list 日志清单，以此判断各服务状态
function pm2_list_all_services() {
    pm2 list | sed "/─/d" | sed "s# ##g; s#│#|#g" | sed "1d" >$FilePm2List
}

function command_service() {
    case $# in
    0)
        print_command_help service
        ;;
    1)
        case $1 in
        start | restart | stop | info | respwd)
            service_manage $1
            ;;
        status)
            service_status
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
