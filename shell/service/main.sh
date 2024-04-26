#!/bin/bash
## Modified: 2024-04-27

## 后端服务控制
# service start/restart/stop/info/respwd
function service_manage() {

    ## 安装网页终端
    function install_ttyd() {
        [ ! -x /usr/bin/ttyd ] && apt-get install -y --no-install-recommends ttyd
        ## 增加环境变量
        export PS1="\[\e[32;1m\]@ARCADIA\[\e[0m\] ➜ \[\e[34;1m\]\w\[\e[0m\] \\$ "
        pm2 start ttyd --name "arcadia_ttyd" --log-date-format "YYYY-MM-DD HH:mm:ss" -- \
            -p 7685 \
            -d 0 \
            -t fontFamily='SF Mono, JetBrains Mono, Courier New, Consolas, monospace' \
            -t fontSize=14 \
            -t lineHeight=1.5 \
            -t disableLeaveAlert=true \
            -t disableResizeOverlay=true \
            -t macOptionIsMeta=true \
            -t macOptionClickForcesSelection=true \
            bash
    }

    local ServiceStatus
    pm2_list_all_services
    cat $FilePm2List | awk -F '|' '{print$3}' | grep "arcadia_server" -wq
    local ExitStatusSERVER=$?
    cat $FilePm2List | awk -F '|' '{print$3}' | grep "arcadia_ttyd" -wq
    local ExitStatusTTYD=$?
    case $1 in
    ## 开启/重启服务
    start | restart)
        ## 禁用 Core Dump
        ulimit -c 0 >/dev/null 2>&1
        ## 删除日志
        rm -rf /root/.pm2/logs/arcadia_server-*.log /root/.pm2/logs/arcadia_inner-*.log /root/.pm2/logs/arcadia_ttyd-*.log
        if [[ ${ExitStatusSERVER} -eq 0 ]]; then
            local ServiceStatus=$(cat $FilePm2List | grep "arcadia_server" -w | awk -F '|' '{print$10}')
            case ${ServiceStatus} in
            online)
                pm2 restart arcadia_server
                pm2 restart arcadia_inner >/dev/null 2>&1
                echo -e "\n$COMPLETE 后台管理面板已重启\n"
                ;;
            stopped)
                pm2 start arcadia_server
                pm2 start arcadia_inner >/dev/null 2>&1
                echo -e "\n$COMPLETE 后台管理面板已重新启动\n"
                ;;
            errored)
                echo -e "\n$WARN 检测到服务状态异常，开始尝试修复...\n"
                pm2 delete arcadia_server
                pm2 delete arcadia_inner >/dev/null 2>&1
                cd $SrcDir
                npm install --omit=dev
                pm2 start ecosystem.config.js && sleep 3
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
            cd $SrcDir
            npm install --omit=dev
            pm2 start ecosystem.config.js && sleep 1
            pm2_list_all_services
            local ServiceStatus=$(cat $FilePm2List | grep "arcadia_server" -w | awk -F '|' '{print$10}')
            if [[ ${ServiceStatus} == "online" ]]; then
                echo -e "\n$SUCCESS 后台管理面板已启动\n"
            else
                echo -e "\n$FAIL 后台管理面板启动失败，请检查原因后重试！\n"
            fi
        fi
        if [[ ${ExitStatusTTYD} -eq 0 ]]; then
            ServiceStatus=$(pm2 describe arcadia_ttyd | grep status | awk '{print $4}')
            case ${ServiceStatus} in
            online)
                pm2 restart arcadia_ttyd
                echo -e "\n$COMPLETE 网页终端已重启\n"
                ;;
            stopped)
                pm2 start arcadia_ttyd
                echo -e "\n$COMPLETE 网页终端已重新启动\n"
                ;;
            errored)
                echo -e "\n$WARN 检测到服务状态异常，开始尝试修复...\n"
                pm2 delete arcadia_ttyd
                cd $RootDir
                install_ttyd && sleep 3
                pm2_list_all_services
                local ServiceNewStatus=$(cat $FilePm2List | grep "arcadia_ttyd" -w | awk -F '|' '{print$10}')
                if [[ "${ServiceNewStatus}" == "online" ]]; then
                    echo -e "\n$SUCCESS 已修复错误，服务恢复正常运行！\n"
                else
                    echo -e "\n$FAIL 未能自动修复错误，请检查原因后重试！\n"
                fi
                ;;
            esac
        else
            cd $RootDir
            install_ttyd && sleep 1
            pm2_list_all_services
            local ServiceStatus=$(cat $FilePm2List | grep "arcadia_ttyd" -w | awk -F '|' '{print$10}')
            if [[ ${ServiceStatus} == "online" ]]; then
                echo -e "\n$SUCCESS 网页终端已启动\n"
            else
                echo -e "\n$FAIL 网页终端启动失败，请检查原因后重试！\n"
            fi
        fi
        ;;
    ## 关闭服务
    stop)
        if [[ ${ExitStatusSERVER} -eq 0 ]]; then
            pm2 stop arcadia_server >/dev/null 2>&1
            if [[ ${ExitStatusTTYD} -eq 0 ]]; then
                pm2 stop arcadia_ttyd >/dev/null 2>&1
            fi
            pm2 list
            echo -e "\n$COMPLETE 后台管理面板和网页终端已关闭\n"
        else
            echo -e "\n$ERROR 服务不存在！\n"
        fi
        ;;
    ## 登录信息
    info)
        if [ ! -f $FileAuthUser ]; then
            cp -f $FileAuthSample $FileAuthUser
        fi
        echo ''
        jq -r '{"用户名": .user, "密码": .password, "OpenAPI令牌": .openApiToken, "最近登录": .lastLoginInfo | { "I P 地址": .loginIp, "地理位置": .loginAddress, "登录时间": .loginTime, }, "当前登录": .curLoginInfo | { "I P 地址": .loginIp, "地理位置": .loginAddress, "登录时间": .loginTime, } }' $FileAuthUser | sed 's|[{},"]||g;'
        echo -e '\n'
        ;;
    ## 重置密码
    respwd)
        cp -f $FileAuthSample $FileAuthUser
        echo -e "\n$COMPLETE 已重置管理面板用于登录认证的用户名和登密码\n\n[用户名]： useradmin\n[密  码]： passwd\n"
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
    Services="arcadia_server arcadia_ttyd tgbot"
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
        arcadia_ttyd)
            ServiceName="[网ㅤ页ㅤ终ㅤ端]"
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
