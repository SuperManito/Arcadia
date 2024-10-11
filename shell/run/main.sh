#!/bin/bash
## Modified: 2024-10-11

## 随机延迟
function random_delay() {
    if [[ -n ${RandomDelay} ]] && [[ ${RandomDelay} -gt 0 ]]; then
        local current_delay=$((${RANDOM} % ${RandomDelay} + 1))
        echo -en "\n$WORKING 已启用随机延迟，此任务将在 ${BLUE}${current_delay}${PLAIN} 秒后开始运行..."
        sleep ${current_delay}
    fi
}

## 静默运行，不推送通知消息
function no_send_notify() {
    ## Server酱
    export PUSH_KEY=""
    export SCKEY_WECOM=""
    export SCKEY_WECOM_URL=""
    ## Bark
    export BARK_PUSH=""
    export BARK_SOUND=""
    export BARK_GROUP=""
    ## Telegram
    export TG_BOT_TOKEN=""
    export TG_USER_ID=""
    ## 钉钉
    export DD_BOT_TOKEN=""
    export DD_BOT_SECRET=""
    ## 企业微信
    export QYWX_KEY=""
    export QYWX_AM=""
    ## pushplus
    export PUSH_PLUS_TOKEN=""
    export PUSH_PLUS_USER=""
    ## WxPusher
    export WP_APP_TOKEN=""
    export WP_UIDS=""
    export WP_TOPICIDS=""
    export WP_URL=""
}

## 推迟执行
function wait_before_run() {
    local params="$1"
    local tmp_print
    [ -z "${params}" ] && params=0
    local tmp_params_format=$(echo "${params}" | perl -pe '{s|[smd]||g}')
    case "${params:0-1}" in
    s)
        tmp_print=" ${BLUE}${tmp_params_format}${PLAIN} 秒"
        ;;
    m)
        tmp_print=" ${BLUE}${tmp_params_format}${PLAIN} 分"
        ;;
    d)
        tmp_print=" ${BLUE}${tmp_params_format}${PLAIN} 天"
        ;;
    *)
        tmp_print=" ${BLUE}${tmp_params_format}${PLAIN} 秒"
        ;;
    esac
    echo -en "\n$WORKING 此任务将在${BLUE}${tmp_print}${PLAIN}后开始运行..."
    sleep ${params}
    echo ''
}

## 打印日期时间
function _print_datetime() {
    echo -e "$(date "+%Y-%m-%d %T.%3N")"
}

## 记录日志标题
function _record_log_start_title() {
    echo -e "[$(_print_datetime)] $1\n" >>${LogFilePath}
}
function _record_log_end_title() {
    echo -e "\n[$(_print_datetime)] $1" >>${LogFilePath}
}

## 定义基准命令
function define_base_command() {
    # 脚本 global-agent 代理（命令选项）
    local global_proxy_option_cmd=""
    [[ "${RUN_OPTION_AGENT}" == "true" || "${EnableGlobalProxy}" == "true" ]] && global_proxy_option_cmd=" -r 'global-agent/bootstrap'"

    # 后台挂起（守护进程）
    if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
        if [[ "${RUN_OPTION_USE_BUN}" == "true" ]]; then
            if [[ "${global_proxy_option_cmd}" ]]; then
                global_proxy_option_cmd=" --${global_proxy_option_cmd}"
            fi
            base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter $(which bun) --name \"${FileName}\" --log <LogFilePath>${global_proxy_option_cmd}"
        else
            case "${FileType}" in
            JavaScript)
                if [[ "${global_proxy_option_cmd}" ]]; then
                    global_proxy_option_cmd=" --${global_proxy_option_cmd}"
                fi
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --name \"${FileName}\" --watch --log <LogFilePath>${global_proxy_option_cmd}"
                ;;
            Python)
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter /usr/bin/python3 --log <LogFilePath> -- -u"
                ;;
            TypeScript)
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter /usr/bin/ts-node --name \"${FileName}\" --log <LogFilePath> -- -T -O '{\"target\":\"esnext\"}'${global_proxy_option_cmd}"
                ;;
            Go)
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter /usr/bin/go --name \"${FileName}\" --log <LogFilePath>"
                ;;
            Lua)
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter /usr/bin/lua --name \"${FileName}\" --log <LogFilePath>"
                ;;
            Ruby)
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter /usr/bin/ruby --name \"${FileName}\" --log <LogFilePath>"
                ;;
            C)
                base_cmd="gcc -o ${FileName} ${FileName}.${FileSuffix} ; pm2 start \"${FileName}\" --name \"${FileName}\" --log <LogFilePath>"
                ;;
            Shell)
                base_cmd="pm2 start \"${FileName}.${FileSuffix}\" --interpreter bash --name \"${FileName}\" --log <LogFilePath>"
                ;;
            esac
        fi

    else
        if [[ "${RUN_OPTION_USE_BUN}" == "true" ]]; then
            base_cmd="bun run${global_proxy_option_cmd} ${FileName}.${FileSuffix} 2>&1"
        else
            case "${FileType}" in
            JavaScript)
                base_cmd="node${global_proxy_option_cmd} ${FileName}.${FileSuffix} 2>&1"
                ;;
            Python)
                base_cmd="python3 -u ${FileName}.${FileSuffix} 2>&1"
                ;;
            TypeScript)
                base_cmd="ts-node -T -O '{\"target\":\"esnext\"}'${global_proxy_option_cmd} ${FileName}.${FileSuffix} 2>&1"
                ;;
            Go)
                base_cmd="go run ${FileName}.${FileSuffix} 2>&1"
                ;;
            Lua)
                base_cmd="lua ${FileName}.${FileSuffix} 2>&1"
                ;;
            Ruby)
                base_cmd="ruby ${FileName}.${FileSuffix} 2>&1"
                ;;
            C)
                base_cmd="gcc -o ${FileName} ${FileName}.${FileSuffix} && ./${FileName} 2>&1"
                ;;
            Shell)
                base_cmd="bash ${FileName}.${FileSuffix} 2>&1"
                ;;
            esac
        fi
    fi
}

## 核心调用
function run_script_core() {
    local run_cmd="$1"
    LogFilePath="${LogPath}/${LogFileName}.log" # 定义日志文件路径（通用）

    # 守护进程（命令选项）
    if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
        # 检测是否已存在
        pm2 list | sed "/─/d" | sed "s| ||g; s#│#|#g" | sed "1d" | awk -F '|' '{print$3}' | grep $FileName -wq
        [ $? -eq 0 ] && operation_title="重启" || operation_title="启动"
        # 删除原有
        pm2 stop $FileName >/dev/null 2>&1
        pm2 flush >/dev/null 2>&1
        pm2 delete $FileName >/dev/null 2>&1
        # 记录执行开始时间
        _record_log_start_title "守护进程启动"
        # 启动（此处特殊，需要替换命令中的日志标记）
        bash -c "$(echo "${run_cmd}" | sed 's/\<LogFilePath\>/'${LogFilePath}'/g')"

    # 后台运行（命令选项）
    elif [[ "${RUN_OPTION_BACKGROUND}" == "true" ]]; then
        if [[ "${RUN_OPTION_NO_LOG}" != "true" ]]; then
            # 记录执行开始时间
            _record_log_start_title "后台执行开始，不记录结束时间"
            run_cmd="${run_cmd} &>>${LogFilePath} &"
        else
            run_cmd="${run_cmd} &>/dev/null &"
        fi
        # 运行超时（命令选项）
        [[ "${RUN_OPTION_TIMEOUT}" == "true" ]] && run_cmd="timeout ${RUN_OPTION_TIMEOUT_OPTIONS} bash -c \"${run_cmd}\""
        # 执行
        bash -c "${run_cmd}"

    # 并发运行（命令选项）
    elif [[ "${RUN_OPTION_CONCURRENT}" == "true" ]]; then
        if [[ "${RUN_OPTION_NO_LOG}" != "true" ]]; then
            # 记录执行开始时间
            _record_log_start_title "后台执行开始，不记录结束时间"
            run_cmd="${run_cmd} &>>${LogFilePath} &"
        else
            run_cmd="${run_cmd} &>/dev/null &"
        fi
        # 运行超时（命令选项）
        [[ "${RUN_OPTION_TIMEOUT}" == "true" ]] && run_cmd="timeout ${RUN_OPTION_TIMEOUT_OPTIONS} bash -c \"${run_cmd}\""
        # 执行
        if [[ $RUN_OPTION_CONCURRENT_TASKS -eq 1 ]]; then
            bash -c "${run_cmd}"
        else
            for ((i = 1; i <= $RUN_OPTION_CONCURRENT_TASKS; i++)); do
                LogFilePath="${LogPath}/${LogFileName}-t${i}.log" # 定义日志文件路径（覆盖）
                bash -c "${run_cmd}"
            done
        fi

    else
        local start_timestamp=$(date +%s)
        if [[ "${RUN_OPTION_NO_LOG}" != "true" ]]; then
            # 记录执行开始时间
            _record_log_start_title "执行开始"
            run_cmd="${run_cmd} | tee -a ${LogFilePath}"
        fi
        # 运行超时（命令选项）
        [[ "${RUN_OPTION_TIMEOUT}" == "true" ]] && run_cmd="timeout ${RUN_OPTION_TIMEOUT_OPTIONS} bash -c \"${run_cmd}\""
        # 执行
        bash -c "${run_cmd}"
        if [[ "${RUN_OPTION_NO_LOG}" != "true" ]]; then
            # 记录执行结束时间
            _record_log_end_title "执行完毕，总用时 $(($(date +%s) - start_timestamp)) 秒"
        fi
    fi
}

function run_script_main() {
    local LogFilePath LogFileName arg_group_item env_value operation_title
    # 禁用 Core Dump
    ulimit -c 0 >/dev/null 2>&1
    # 进入脚本所在目录
    cd ${FileDir}
    # 创建日志存储目录
    make_dir ${LogPath}
    # 定义运行次数
    local run_times=1 # 注：使用并发时必定为1
    # 循环运行（命令选项）
    [[ "${RUN_OPTION_LOOP}" == "true" ]] && run_times=$((RUN_OPTION_LOOP_TIMES + 1))
    # 定义基准命令
    local base_cmd=""
    define_base_command

    import run/env

    # 分组运行（命令选项）
    if [[ "${RUN_OPTION_RECOMBINE_ENV_GROUP}" == "true" ]]; then
        # 推迟执行（命令选项）
        [[ "${RUN_OPTION_WAIT}" == "true" ]] && wait_before_run "${RUN_OPTION_WAIT_TIMES}"
        # 定义日志文件名称
        [[ -z "${RUN_OPTION_CONCURRENT}" ]] && LogFileName="$(date "+%Y-%m-%d-%H-%M-%S")"

        local group_index=1
        for arg_group_item in $(echo "${RUN_OPTION_RECOMBINE_ENV_ARG}" | tr '@' ' '); do
            # 重组环境变量值
            recombine_composite_env_values "${RUN_OPTION_RECOMBINE_ENV_NAME}" "${RUN_OPTION_RECOMBINE_ENV_SEPARATOR}" "${arg_group_item}"
            if [[ "${RUN_OPTION_CONCURRENT}" == "true" ]]; then
                # 定义日志文件名称
                LogFileName="$(date "+%Y-%m-%d-%H-%M-%S")-g${group_index}"
            else
                # 任务空行
                [ $group_index -gt 1 ] && echo -e "\n[$(_print_datetime)] 下一运行任务\n" >>${LogFilePath}
            fi
            # 执行
            for ((i = 1; i <= $run_times; i++)); do
                # 延迟执行（命令选项）
                [[ "${RUN_OPTION_DELAY}" == "true" ]] && random_delay
                run_script_core "${base_cmd}"
            done
            # 恢复原有变量值以应用下一次重组匹配
            eval export "${RUN_OPTION_RECOMBINE_ENV_NAME}"=\""${RUN_OPTION_RECOMBINE_ENV_ORIGINAL_VALUE}"\"
            let group_index++
        done

    # 拆分运行（命令选项）
    elif [[ "${RUN_OPTION_SPLIT_ENV}" == "true" ]]; then
        # 变量重组（命令选项）
        if [[ "${RUN_OPTION_RECOMBINE_ENV}" == "true" ]]; then
            recombine_composite_env_values "${RUN_OPTION_RECOMBINE_ENV_NAME}" "${RUN_OPTION_RECOMBINE_ENV_SEPARATOR}" "${RUN_OPTION_RECOMBINE_ENV_ARG}"
        fi
        # 推迟执行（命令选项）
        [[ "${RUN_OPTION_WAIT}" == "true" ]] && wait_before_run "${RUN_OPTION_WAIT_TIMES}"
        # 定义日志文件名称
        [[ -z "${RUN_OPTION_CONCURRENT}" ]] && LogFileName="$(date "+%Y-%m-%d-%H-%M-%S")"

        local env_index=1
        for env_value in $(echo "${RUN_OPTION_SPLIT_ENV_ORIGINAL_VALUE}" | tr "${RUN_OPTION_SPLIT_ENV_SEPARATOR}" ' '); do
            # 重新声明环境变量
            eval export "${RUN_OPTION_SPLIT_ENV_NAME}"=\""${env_value}"\"
            if [[ "${RUN_OPTION_CONCURRENT}" == "true" ]]; then
                # 定义日志文件名称
                LogFileName="$(date "+%Y-%m-%d-%H-%M-%S")-e${env_index}"
            else
                # 任务空行
                [ $group_index -gt 1 ] && echo -e "\n[$(_print_datetime)] 下一运行任务\n" >>${LogFilePath}
            fi
            # 执行
            for ((i = 1; i <= $run_times; i++)); do
                # 延迟执行（命令选项）
                [[ "${RUN_OPTION_DELAY}" == "true" ]] && random_delay
                run_script_core "${base_cmd}"
            done
            let env_index++
        done

    else
        # 变量重组（命令选项）
        if [[ "${RUN_OPTION_RECOMBINE_ENV}" == "true" ]]; then
            recombine_composite_env_values "${RUN_OPTION_RECOMBINE_ENV_NAME}" "${RUN_OPTION_RECOMBINE_ENV_SEPARATOR}" "${RUN_OPTION_RECOMBINE_ENV_ARG}"
        fi
        # 推迟执行（命令选项）
        [[ "${RUN_OPTION_WAIT}" == "true" ]] && wait_before_run "${RUN_OPTION_WAIT_TIMES}"
        # 定义日志文件名称
        LogFileName="$(date "+%Y-%m-%d-%H-%M-%S")"
        # 执行
        for ((i = 1; i <= $run_times; i++)); do
            # 延迟执行（命令选项）
            [[ "${RUN_OPTION_DELAY}" == "true" ]] && random_delay
            run_script_core "${base_cmd}"
        done
    fi

    ## 打印
    # 守护进程（命令选项）
    if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
        echo -e "\n$COMPLETE 已${operation_title} ${BLUE}$FileName${PLAIN} 守护进程，日志位于 ${BLUE}${LogFilePath}${PLAIN}\n"
    # 后台运行 & 并发运行
    elif [[ "${RUN_OPTION_BACKGROUND}" == "true" ]] || [[ "${RUN_OPTION_CONCURRENT}" == "true" ]]; then
        echo -e "\n$COMPLETE 已部署所有任务于后台运行，如需查询代码运行记录请前往 ${BLUE}$(echo "${LogPath}" | awk -F "${RootDir}/" '{print$2}')${PLAIN} 目录查看最新日志\n"
    fi

    # 判断远程脚本执行后是否删除
    if [[ "${RUN_REMOTE}" == "true" && "${AutoDelRawFiles}" == "true" ]]; then
        rm -rf "${FileDir}/${FileName}.${FileSuffix}"
    fi
}

function command_run_main() {
    ## 匹配代码文件
    import core/script
    find_script "${1}"

    if [[ "${FileType}" != "JavaScript" && "${FileType}" != "TypeScript" ]]; then
        # 判断脚本代理
        if [[ "${RUN_OPTION_AGENT}" == "true" ]]; then
            output_error "检测到无效参数 ${BLUE}--agent${PLAIN} ，仅支持运行 JavaScript 和 TypeScript 代码文件！"
        fi
        # 判断 Bun 运行环境
        if [[ "${RUN_OPTION_USE_BUN}" == "true" ]]; then
            output_error "检测到无效参数 ${BLUE}--use-bun${PLAIN} ，仅支持运行 JavaScript 和 TypeScript 代码文件！"
        fi
    fi

    ## 加载用户配置
    # 用户环境变量（加载优先级应高于配置文件）
    load_user_env
    # 配置文件
    import_config ${FileName}

    # 静默运行（命令选项）
    [[ "${RUN_OPTION_SILENT}" == "true" ]] && no_send_notify

    ## 变量操作相关命令选项
    # 判断变量是否存在并定义原有值变量
    if [[ "${RUN_OPTION_RECOMBINE_ENV_NAME}" ]]; then
        RUN_OPTION_RECOMBINE_ENV_ORIGINAL_VALUE="${!RUN_OPTION_RECOMBINE_ENV_NAME}"
        [[ -z "${RUN_OPTION_RECOMBINE_ENV_ORIGINAL_VALUE}" ]] && output_error "变量 ${BLUE}${RUN_OPTION_RECOMBINE_ENV_NAME}${PLAIN} 不存在或值为空"
    fi
    if [[ "${RUN_OPTION_SPLIT_ENV_NAME}" ]]; then
        RUN_OPTION_SPLIT_ENV_ORIGINAL_VALUE="${!RUN_OPTION_SPLIT_ENV_NAME}"
        [[ -z "${RUN_OPTION_SPLIT_ENV_ORIGINAL_VALUE}" ]] && output_error "变量 ${BLUE}${RUN_OPTION_SPLIT_ENV_NAME}${PLAIN} 不存在或值为空"
    fi

    # 执行用户自定义执行前脚本
    if [[ "${EnableTaskBeforeExtra}" == "true" ]] && [[ -f $FileTaskBeforeExtra ]]; then
        source $FileTaskBeforeExtra
    fi

    run_script_main

    # 执行用户自定义执行后脚本
    if [[ "${EnableTaskAfterExtra}" == "true" ]] && [[ -f $FileTaskAfterExtra ]]; then
        source $FileTaskAfterExtra
    fi
}

## 检查命令选项兼容性和使用合法性
function command_run_check_options() {
    ## 不可同时使用
    check_usability() {
        local var1=$1
        local var2=$2
        local option1=$3
        local option2=$4
        if [[ "${!var1}" == "true" ]] && [[ "${!var2}" == "true" ]]; then
            output_error "${BLUE}${option1}${PLAIN} 与 ${BLUE}${option2}${PLAIN} 不可同时使用！"
        fi
    }
    # 并发运行 & 后台运行（无意义）
    check_usability "RUN_OPTION_CONCURRENT" "RUN_OPTION_BACKGROUND" "--concurrent" "--background"
    # 并发运行 & 循环运行（用法冲突，并发本身就支持设置运行任务数量）
    check_usability "RUN_OPTION_CONCURRENT" "RUN_OPTION_LOOP" "--concurrent" "--loop"
    # 并发运行 & 守护进程（同一代码文件只能启动一个守护进程）
    check_usability "RUN_OPTION_CONCURRENT" "RUN_OPTION_DAEMON" "--concurrent" "--daemon"
    # 分组运行 & 变量重组（功能冲突）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_RECOMBINE_ENV" "--recombine-env-group" "--recombine-env"
    # 分组运行 & 拆分运行（功能冲突）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_SPLIT_ENV" "--recombine-env-group" "--split-env"
    # 分组运行 & 后台运行（用法冲突，等同于并发）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_BACKGROUND" "--recombine-env-group" "--background"
    # 分组运行 & 守护进程（同一代码文件只能启动一个守护进程）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_DAEMON" "--recombine-env-group" "--daemon"
    # 拆分运行 & 后台运行（用法冲突，等同于并发）
    check_usability "RUN_OPTION_SPLIT_ENV" "RUN_OPTION_BACKGROUND" "--split-env" "--background"
    # 拆分运行 & 守护进程（同一代码文件只能启动一个守护进程）
    check_usability "RUN_OPTION_SPLIT_ENV" "RUN_OPTION_DAEMON" "--split-env" "--daemon"
    # 守护进程 & 后台运行（无意义）
    check_usability "RUN_OPTION_DAEMON" "RUN_OPTION_BACKGROUND" "--daemon" "--background"
    # 守护进程 & 循环运行（无意义）
    check_usability "RUN_OPTION_DAEMON" "RUN_OPTION_LOOP" "--daemon" "--loop"
    ## 检测无意义的并发
    if [[ "${RUN_OPTION_CONCURRENT}" == "true" ]] && [[ $RUN_OPTION_CONCURRENT_TASKS -eq 1 ]]; then
        if [[ -z "${RUN_OPTION_RECOMBINE_ENV_GROUP}" ]] && [[ -z "${RUN_OPTION_SPLIT_ENV}" ]]; then
            output_error "无意义的并发，请使用后台运行命令选项或指定并发任务数量！"
        fi
    fi
}

function command_run() {
    case $# in
    0)
        print_command_help run
        ;;
    1)
        command_run_main $1
        ;;
    *)
        local run_target="${1}"
        shift
        # 判断命令选项
        while [ $# -gt 0 ]; do
            case "$1" in
            -l | --loop)
                if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定循环次数！"
                fi
                echo "$2" | grep -Eq "^[0-9]+$"
                if [ $? -ne 0 ]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 不是正整数！"
                fi
                RUN_OPTION_LOOP="true"
                RUN_OPTION_LOOP_TIMES="$2"
                shift
                ;;
            -s | --silent)
                RUN_OPTION_SILENT="true"
                ;;
            -w | --wait)
                if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定等待时间！"
                fi
                if echo "$2" | grep -Eq "[abcefgijklnopqrtuvwxyzA-Z,/\!@#$%^&*|\-_=\+]|\(|\)|\[|\]|\{|\}" || echo "$2" | grep -Eqv "[0-9]+([smhd]|(\.[0-9]+))$"; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 语法有误！"
                fi
                RUN_OPTION_WAIT="true"
                RUN_OPTION_WAIT_TIMES="$2"
                shift
                ;;
            -D | --delay)
                RUN_OPTION_DELAY="true"
                ;;
            -a | --agent)
                RUN_OPTION_AGENT="true"
                ;;
            -T | --timeout)
                if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定超时命令选项！"
                fi
                RUN_OPTION_TIMEOUT="true"
                RUN_OPTION_TIMEOUT_OPTIONS="$2"
                shift
                ;;
            -N | --no-log)
                RUN_OPTION_NO_LOG="true"
                ;;
            -p | --proxy)
                echo ${run_target} | grep -Eq "https?://.*github"
                if [ $? -ne 0 ]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，该命令选项仅适用于执行位于 GitHub 仓库的代码文件，请确认后重新输入！"
                fi
                RUN_OPTION_DOWNLOAD_PROXY="true"
                ;;
            -d | --daemon)
                RUN_OPTION_DAEMON="true"
                ;;
            -B | --use-bun)
                RUN_OPTION_USE_BUN="true"
                ;;
            -b | --background)
                RUN_OPTION_BACKGROUND="true"
                ;;
            -c | --concurrent)
                if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                    RUN_OPTION_CONCURRENT="true"
                    RUN_OPTION_CONCURRENT_TASKS="1"
                elif ! echo "$2" | grep -Eq "^[0-9]+$" || [[ "$2" -lt 1 ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，指定的任务数量有误！"
                else
                    RUN_OPTION_CONCURRENT="true"
                    RUN_OPTION_CONCURRENT_TASKS="$2"
                    shift
                fi
                ;;
            -r | --recombine-env)
                if [[ -z "$2" ]] || [[ "$2" == -* ]] || [[ -z "$3" ]] || [[ "$3" == -* ]] || [[ -z "$4" ]] || [[ "$4" == -* ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后分别指定变量名称、分隔符、重组表达式！"
                fi
                echo "$4" | grep -Eq "[a-zA-Z\.;:\<\>/\!@#$^&*|\-_=\+]|\(|\)|\[|\]|\{|\}"
                if [ $? -eq 0 ]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，重组表达式 ${BLUE}$4${PLAIN} 语法有误！"
                fi
                RUN_OPTION_RECOMBINE_ENV="true"
                RUN_OPTION_RECOMBINE_ENV_NAME="$2"
                RUN_OPTION_RECOMBINE_ENV_SEPARATOR="$3"
                RUN_OPTION_RECOMBINE_ENV_ARG="$4"
                shift
                shift
                shift
                ;;
            -R | --recombine-env-group)
                if [[ -z "$2" ]] || [[ "$2" == -* ]] || [[ -z "$3" ]] || [[ "$3" == -* ]] || [[ -z "$4" ]] || [[ "$4" == -* ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后分别指定变量名称、分隔符、重组表达式！"
                fi
                echo "$4" | grep -Eq "[a-zA-Z\.;:\<\>/\!#$^&*|\-_=\+]|\(|\)|\[|\]|\{|\}"
                if [ $? -eq 0 ]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，重组表达式 ${BLUE}$4${PLAIN} 语法有误！"
                fi
                ## 判断是否已分组
                echo "$4" | grep -Eq "@"
                if [ $? -ne 0 ]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请定义分组，否则请使用变量重组命令选项！"
                fi
                RUN_OPTION_RECOMBINE_ENV_GROUP="true"
                RUN_OPTION_RECOMBINE_ENV_NAME="$2"
                RUN_OPTION_RECOMBINE_ENV_SEPARATOR="$3"
                RUN_OPTION_RECOMBINE_ENV_ARG="$4"
                shift
                shift
                shift
                ;;
            -S | --split-env)
                if [[ -z "$2" ]] || [[ "$2" == -* ]] || [[ -z "$3" ]] || [[ "$3" == -* ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后分别指定变量名称、分隔符！"
                fi
                RUN_OPTION_SPLIT_ENV="true"
                RUN_OPTION_SPLIT_ENV_NAME="$2"
                RUN_OPTION_SPLIT_ENV_SEPARATOR="$3"
                shift
                shift
                ;;
            *)
                output_error "命令选项 ${BLUE}$1${PLAIN} 错误，字段名称不存在！"
                ;;
            esac
            shift
        done

        # 检查选项兼容性
        command_run_check_options
        # 运行
        command_run_main "${run_target}"
        ;;
    esac
}
