#!/bin/bash

function command_run_main() {
    ## 匹配代码文件
    import core/script
    find_script "${1}"

    if [[ "${FileType}" != "JavaScript" && "${FileType}" != "TypeScript" ]]; then
        # 判断脚本代理
        if [[ "${RUN_OPTION_AGENT}" == "true" ]]; then
            output_error "检测到无效参数 ${BLUE}--agent${PLAIN} ，仅支持运行 ${BLUE}JavaScript${PLAIN} 与 ${BLUE}TypeScript${PLAIN} 代码文件！"
        fi
    fi

    ## 加载用户配置
    # 用户环境变量（加载优先级应高于配置文件）
    load_user_env
    # 配置文件
    import_config ${FileName}

    ## 检查运行环境
    ensure_runtime_available

    import run/core

    # 静默运行（命令选项）
    [[ "${RUN_OPTION_SILENT}" == "true" ]] && not_send_notify

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
    if [[ "${CLI_CONFIG_ENABLE_TASK_BEFORE_EXTRA}" == "true" ]] && [[ -f $FileTaskBeforeExtra ]]; then
        source $FileTaskBeforeExtra
    fi

    run_script_main

    # 执行用户自定义执行后脚本
    if [[ "${CLI_CONFIG_ENABLE_TASK_AFTER_EXTRA}" == "true" ]] && [[ -f $FileTaskAfterExtra ]]; then
        source $FileTaskAfterExtra
    fi
}

function reset_options() {
    # 运行模式
    RUN_OPTION_DAEMON=""
    RUN_OPTION_DAEMON_NAME=""
    RUN_OPTION_DAEMON_MAX_RESTARTS=""
    RUN_OPTION_DAEMON_RESTART_DELAY=""
    RUN_OPTION_DAEMON_LOG_FILE=""
    RUN_OPTION_DAEMON_RESTART_CRON=""
    RUN_OPTION_DAEMON_NO_AUTORESTART=""
    RUN_OPTION_DAEMON_MAX_MEMORY_RESTART=""
    RUN_OPTION_DAEMON_STOP_EXIT_CODES=""
    RUN_OPTION_DAEMON_EXP_BACKOFF_RESTART_DELAY=""
    RUN_OPTION_BACKGROUND=""
    RUN_OPTION_CONCURRENT=""
    RUN_OPTION_CONCURRENT_TASKS=""
    RUN_OPTION_THREAD=""
    RUN_OPTION_THREAD_NUM=""
    # 运行控制
    RUN_OPTION_LOOP=""
    RUN_OPTION_LOOP_TIMES=""
    RUN_OPTION_WAIT=""
    RUN_OPTION_WAIT_TIMES=""
    RUN_OPTION_DELAY=""
    RUN_OPTION_TIMEOUT=""
    RUN_OPTION_TIMEOUT_OPTIONS=""
    RUN_OPTION_SILENT=""
    RUN_OPTION_NO_LOG=""
    # 环境变量操作
    RUN_OPTION_RECOMBINE_ENV=""
    RUN_OPTION_RECOMBINE_ENV_NAME=""
    RUN_OPTION_RECOMBINE_ENV_SEPARATOR=""
    RUN_OPTION_RECOMBINE_ENV_ARG=""
    RUN_OPTION_RECOMBINE_ENV_ORIGINAL_VALUE=""
    RUN_OPTION_RECOMBINE_ENV_GROUP=""
    RUN_OPTION_SPLIT_ENV=""
    RUN_OPTION_SPLIT_ENV_NAME=""
    RUN_OPTION_SPLIT_ENV_SEPARATOR=""
    RUN_OPTION_SPLIT_ENV_ORIGINAL_VALUE=""
    # 运行环境
    RUN_OPTION_AGENT=""
    RUN_OPTION_DOWNLOAD_PROXY=""
    RUN_OPTION_EXECUTOR_ARGS=""
    RUN_OPTION_PASS_THROUGH_ARGS=""
    RUN_OPTION_USE_DENO=""
    RUN_OPTION_USE_BUN=""
    RUN_OPTION_USE_TS_NODE=""
    RUN_OPTION_USE_NODE=""
    RUN_OPTION_USE_TSX=""
}

## 检查命令选项兼容性和使用合法性
function command_run_check_options() {
    ## 不可同时使用
    function check_usability() {
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
    # 分组运行 & 变量重组（功能冲突）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_RECOMBINE_ENV" "--recombine-env-group" "--recombine-env"
    # 分组运行 & 拆分运行（功能冲突）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_SPLIT_ENV" "--recombine-env-group" "--split-env"
    # 分组运行 & 后台运行（用法冲突，等同于并发）
    check_usability "RUN_OPTION_RECOMBINE_ENV_GROUP" "RUN_OPTION_BACKGROUND" "--recombine-env-group" "--background"
    # 拆分运行 & 后台运行（用法冲突，等同于并发）
    check_usability "RUN_OPTION_SPLIT_ENV" "RUN_OPTION_BACKGROUND" "--split-env" "--background"
    # 无意义的并发
    if [[ "${RUN_OPTION_CONCURRENT}" == "true" ]] && [[ $RUN_OPTION_CONCURRENT_TASKS -eq 1 ]]; then
        if [[ -z "${RUN_OPTION_RECOMBINE_ENV_GROUP}" ]] && [[ -z "${RUN_OPTION_SPLIT_ENV}" ]]; then
            output_error "无意义的并发，请使用后台运行命令选项或指定并发任务数量！"
        fi
    fi
    # 线程数控制必须配合并发使用
    if [[ "${RUN_OPTION_THREAD}" == "true" ]] && [[ "${RUN_OPTION_CONCURRENT}" != "true" ]]; then
        output_error "检测到无效参数 ${BLUE}--thread${PLAIN} ，该命令选项仅适用于并发运行模式，请配合 ${BLUE}--concurrent${PLAIN} 使用！"
    fi
}

function command_run() {
    ## 命令选项变量初始化（防止环境变量污染）
    reset_options

    local subcmd="$1"
    if [[ "$1" == "rund" ]]; then
        RUN_OPTION_DAEMON="true"
    fi
    shift

    case $# in
    0)
        print_command_help $subcmd
        ;;
    1)
        if [[ "$1" == "--help" || "$1" == "-h" ]]; then
            print_command_help $subcmd
        else
            command_run_main $1
        fi
        ;;
    *)
        local run_target="${1}"
        shift
        # 判断命令选项
        while [ $# -gt 0 ]; do
            # 检查是否为分隔符
            if [[ "$1" == "--" ]]; then
                if [ $# -gt 0 ]; then
                    shift
                    RUN_OPTION_PASS_THROUGH_ARGS="$@"
                else
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定要传递给代码执行器的命令选项！"
                fi
                break
            fi

            ## 通用选项
            case "$1" in
            -s | --silent)
                RUN_OPTION_SILENT="true"
                ;;
            -a | --agent)
                RUN_OPTION_AGENT="true"
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
            -E | --exec-args)
                if [[ -z "$2" ]]; then
                    output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定执行器参数内容！"
                fi
                RUN_OPTION_EXECUTOR_ARGS="$2"
                shift
                ;;
            --deno | --use-deno)
                RUN_OPTION_USE_DENO="true"
                ;;
            --bun | --use-bun)
                RUN_OPTION_USE_BUN="true"
                ;;
            --ts-node | --use-ts-node)
                RUN_OPTION_USE_TS_NODE="true"
                ;;
            --node | --use-node)
                RUN_OPTION_USE_NODE="true"
                ;;
            --tsx | --use-tsx)
                RUN_OPTION_USE_TSX="true"
                ;;
            esac

            if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
                ## 守护进程任务专用命令选项
                case "$1" in
                --name)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定进程名称！"
                    fi
                    RUN_OPTION_DAEMON_NAME="$2"
                    shift
                    ;;
                --max-restarts)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定最大重启次数！"
                    fi
                    echo "$2" | grep -Eq "^[0-9]+$"
                    if [ $? -ne 0 ]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 不是非负整数！"
                    fi
                    RUN_OPTION_DAEMON_MAX_RESTARTS="$2"
                    shift
                    ;;
                --restart-delay)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定重启延迟毫秒数！"
                    fi
                    echo "$2" | grep -Eq "^[0-9]+$"
                    if [ $? -ne 0 ]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 不是非负整数！"
                    fi
                    RUN_OPTION_DAEMON_RESTART_DELAY="$2"
                    shift
                    ;;
                --log-file)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定日志文件路径！"
                    fi
                    RUN_OPTION_DAEMON_LOG_FILE="$2"
                    shift
                    ;;
                --restart-cron)
                    if [[ -z "$2" ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定 Cron 表达式！"
                    fi
                    RUN_OPTION_DAEMON_RESTART_CRON="$2"
                    shift
                    ;;
                --no-autorestart)
                    RUN_OPTION_DAEMON_NO_AUTORESTART="true"
                    ;;
                --max-memory-restart)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定最大内存限制（例如 200M）！"
                    fi
                    RUN_OPTION_DAEMON_MAX_MEMORY_RESTART="$2"
                    shift
                    ;;
                --stop-exit-codes)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定不触发重启的退出码！"
                    fi
                    echo "$2" | grep -Eq "^[0-9]+$"
                    if [ $? -ne 0 ]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 不是非负整数！"
                    fi
                    RUN_OPTION_DAEMON_STOP_EXIT_CODES="$2"
                    shift
                    ;;
                --exp-backoff-restart-delay)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定指数退避起始延迟毫秒数！"
                    fi
                    echo "$2" | grep -Eq "^[0-9]+$"
                    if [ $? -ne 0 ]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 不是非负整数！"
                    fi
                    RUN_OPTION_DAEMON_EXP_BACKOFF_RESTART_DELAY="$2"
                    shift
                    ;;
                *)
                    output_error "命令选项 ${BLUE}$1${PLAIN} 错误，字段名称不存在！"
                    ;;
                esac
            else
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
                    echo "${run_target}" | grep -Eq "https?://.*github"
                    if [ $? -ne 0 ]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，该命令选项仅适用于执行位于 GitHub 仓库的代码文件，请确认后重新输入！"
                    fi
                    RUN_OPTION_DOWNLOAD_PROXY="true"
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
                -t | --thread)
                    if [[ -z "$2" ]] || [[ "$2" == -* ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，请在该命令选项后指定并发线程数！"
                    fi
                    echo "$2" | grep -Eq "^[0-9]+$"
                    if [ $? -ne 0 ] || [[ "$2" -lt 1 ]]; then
                        output_error "命令选项 ${BLUE}$1${PLAIN} 无效，选项值 ${BLUE}$2${PLAIN} 不是有效的正整数！"
                    fi
                    RUN_OPTION_THREAD="true"
                    RUN_OPTION_THREAD_NUM="$2"
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
            fi
            shift
        done

        # 检查选项兼容性
        command_run_check_options
        # 运行
        command_run_main "${run_target}"
        ;;
    esac
}
