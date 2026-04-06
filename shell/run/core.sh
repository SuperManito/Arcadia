#!/bin/bash

## 随机延迟
function random_delay() {
    if [[ -n ${CLI_CONFIG_RUN_DELAY_MAX_SECONDS} ]] && [[ ${CLI_CONFIG_RUN_DELAY_MAX_SECONDS} -gt 0 ]]; then
        local current_delay=$((${RANDOM} % ${CLI_CONFIG_RUN_DELAY_MAX_SECONDS} + 1))
        echo -en "\n$WORKING 已启用随机延迟，此任务将在 ${BLUE}${current_delay}${PLAIN} 秒后开始运行..."
        sleep ${current_delay}
    fi
}

## 静默运行，不推送通知消息
function not_send_notify() {
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
    h)
        tmp_print=" ${BLUE}${tmp_params_format}${PLAIN} 时"
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
    echo "$(date "+%Y-%m-%d %T.%3N")"
}

## 记录日志标题
function _record_log_start_title() {
    echo -e "[$(_print_datetime)] $1\n" >>${LogFilePath}
}
function _record_log_end_title() {
    echo -e "\n[$(_print_datetime)] $1" >>${LogFilePath}
}

## 初始化线程池（基于 FIFO 管道的信号量机制）
function _thread_pool_init() {
    local max_threads=$1
    local fifo_path=$(mktemp -u)
    mkfifo "${fifo_path}"
    exec {_THREAD_FD}<>"${fifo_path}"
    rm -f "${fifo_path}"
    for ((i = 0; i < max_threads; i++)); do
        echo >&${_THREAD_FD}
    done
}

## 获取线程池令牌（阻塞直到有可用令牌）
function _thread_pool_acquire() {
    read -u ${_THREAD_FD}
}

## 释放线程池令牌
function _thread_pool_release() {
    if [[ -n "${_THREAD_FD}" ]]; then
        echo >&${_THREAD_FD} 2>/dev/null
    fi
}

## 销毁线程池
function _thread_pool_destroy() {
    exec {_THREAD_FD}>&-
}

## 并发任务调度分发
function _concurrent_dispatch() {
    local run_cmd="$1"
    local task_log_path="$2"
    # 日志重定向
    if [[ "${RUN_OPTION_NO_LOG}" != "true" ]]; then
        run_cmd="${run_cmd} &>>${task_log_path}"
    else
        run_cmd="${run_cmd} &>/dev/null"
    fi
    # 运行超时（命令选项）
    [[ "${RUN_OPTION_TIMEOUT}" == "true" ]] && run_cmd="timeout ${RUN_OPTION_TIMEOUT_OPTIONS} bash -c \"${run_cmd}\""
    if [[ "${RUN_OPTION_THREAD}" == "true" ]]; then
        ## 线程池模式（受限并发执行）
        _thread_task_index=$((_thread_task_index + 1))
        local _task_label="[${_thread_task_index}/${_thread_task_total}]"
        [[ "${RUN_OPTION_NO_LOG}" != "true" ]] && echo -e "[$(_print_datetime)] ${_task_label} 后台执行开始，不记录结束时间\n" >>"${task_log_path}"
        # 等待线程池令牌
        _thread_pool_acquire
        echo -e "[$(_print_datetime)] ${_task_label} 任务开始"
        # 通过 EXIT trap 确保令牌在任何退出情况下都能被释放
        (
            trap '' INT
            trap '_thread_pool_release' EXIT
            local _task_start=$(date +%s)
            eval "${run_cmd}"
            # 父进程已退出（Ctrl+C）则不再打印，避免干扰终端
            kill -0 $$ 2>/dev/null && echo -e "[$(_print_datetime)] ${_task_label} 运行完毕 ${GREEN}✔${PLAIN}（耗时 $(($(date +%s) - _task_start)) 秒）"
        ) &
    else
        ## 全量并发
        [[ "${RUN_OPTION_NO_LOG}" != "true" ]] && echo -e "[$(_print_datetime)] 后台执行开始，不记录结束时间\n" >>"${task_log_path}"
        bash -c "${run_cmd}" &
    fi
}

## 定义基准命令
function define_base_command() {
    local run_target="${FileName}.${FileSuffix}"
    # 传递给代码文件执行器的参数
    local interpreter_args=""
    if [[ "${RUN_OPTION_EXECUTOR_ARGS}" ]]; then
        interpreter_args="${RUN_OPTION_EXECUTOR_ARGS}"
    fi
    # 传递给代码文件的参数
    local script_args=""
    if [[ "${RUN_OPTION_PASS_THROUGH_ARGS}" ]]; then
        script_args="${RUN_OPTION_PASS_THROUGH_ARGS}"
    fi

    # 后台挂起（守护进程）
    if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
        local interpreter
        local _daemon_name="${RUN_OPTION_DAEMON_NAME:-$FileName}"
        local _daemon_max_restarts="${RUN_OPTION_DAEMON_MAX_RESTARTS:-99999}"
        local _daemon_restart_delay="${RUN_OPTION_DAEMON_RESTART_DELAY:-0}"
        local _daemon_log_file="${RUN_OPTION_DAEMON_LOG_FILE:-"<LogFilePath>"}"

        local pm2_base_cmd="--name \"${_daemon_name}\" --log \"${_daemon_log_file}\" --output '/dev/null' --error '/dev/null' --restart-delay ${_daemon_restart_delay} --max-restarts ${_daemon_max_restarts}"

        if [[ -n "${RUN_OPTION_DAEMON_RESTART_CRON}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --cron-restart \"${RUN_OPTION_DAEMON_RESTART_CRON}\""
        fi
        if [[ "${RUN_OPTION_DAEMON_NO_AUTORESTART}" == "true" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --no-autorestart"
        fi
        if [[ -n "${RUN_OPTION_DAEMON_MAX_MEMORY_RESTART}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --max-memory-restart ${RUN_OPTION_DAEMON_MAX_MEMORY_RESTART}"
        fi
        if [[ -n "${RUN_OPTION_DAEMON_STOP_EXIT_CODES}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --stop-exit-codes ${RUN_OPTION_DAEMON_STOP_EXIT_CODES}"
        fi
        if [[ -n "${RUN_OPTION_DAEMON_EXP_BACKOFF_RESTART_DELAY}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --exp-backoff-restart-delay ${RUN_OPTION_DAEMON_EXP_BACKOFF_RESTART_DELAY}"
        fi

        case "${FileType}" in
        JavaScript | TypeScript)
            # 网络代理（命令选项）
            if [[ "${RUN_OPTION_AGENT}" == "true" ]]; then
                # 注：该选项在 Bun 和 Deno 中通用
                interpreter_args="-r 'global-agent/bootstrap'${interpreter_args:+" ${interpreter_args}"}"
            fi
            case "${JS_AND_TS_EXECUTE_METHOD}" in
            node)
                if [[ "${FileType}" == "TypeScript" ]]; then
                    interpreter_args="--experimental-strip-types${interpreter_args:+" ${interpreter_args}"}"
                fi
                pm2_base_cmd="${pm2_base_cmd}"
                ;;
            tsx)
                interpreter="$(which tsx)"
                ;;
            bun)
                interpreter="$(which bun)"
                ;;
            deno)
                interpreter_args="run --no-code-cache --no-prompt --allow-env --allow-read=$(pwd) --allow-write=$(pwd) --allow-net --deny-net=127.0.0.1,172.17.0.1,$(hostname -I)${interpreter_args:+" ${interpreter_args}"}"
                interpreter="$(which deno)"
                ;;
            ts-node)
                interpreter_args="-T -O '{\"target\":\"esnext\"}'${interpreter_args:+" ${interpreter_args}"}"
                interpreter="$(which ts-node)"
                ;;
            esac
            ;;
        Python)
            if [[ "${CLI_CONFIG_ENABLE_PYTHON_UV}" == "true" ]]; then
                # pm2：uv run script.py，不传 -- -u 避免 pm2 追加 -- script_args 时产生双重 --
                interpreter_args="run \"${run_target}\"${interpreter_args:+" ${interpreter_args}"}"
                interpreter="$(which uv)"
            else
                interpreter_args="-u${interpreter_args:+" ${interpreter_args}"}"
                interpreter="$(which python3)"
            fi
            ;;
        Go)
            interpreter="$(which go)"
            ;;
        Lua)
            interpreter="$(which lua)"
            ;;
        Ruby)
            interpreter="$(which ruby)"
            ;;
        Rust)
            interpreter_args="script${interpreter_args:+" ${interpreter_args}"}"
            interpreter="$(which cargo)"
            ;;
        Perl)
            interpreter="$(which perl)"
            ;;
        Shell)
            interpreter="bash"
            ;;
        esac

        if [[ "${interpreter}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --interpreter ${interpreter}"
        fi
        if [[ "${interpreter_args}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} --interpreter-args='${interpreter_args}'"
        fi
        if [[ "${script_args}" ]]; then
            pm2_base_cmd="${pm2_base_cmd} -- ${script_args}"
        fi

        case "${FileType}" in
        C)
            base_cmd="gcc -o ${FileName} ${run_target} ; pm2 start \"${FileName}\" ${pm2_base_cmd}"
            ;;
        *)
            base_cmd="pm2 start \"${run_target}\" ${pm2_base_cmd}"
            ;;
        esac

    else
        case "${FileType}" in
        JavaScript | TypeScript)
            # 网络代理（命令选项）
            if [[ "${RUN_OPTION_AGENT}" == "true" ]]; then
                # 注：该选项在 Bun 和 Deno 中通用
                interpreter_args="-r 'global-agent/bootstrap'${interpreter_args:+" ${interpreter_args}"}"
            fi
            case "${JS_AND_TS_EXECUTE_METHOD}" in
            node)
                if [[ "${FileType}" == "TypeScript" ]]; then
                    interpreter_args="--experimental-strip-types${interpreter_args:+" ${interpreter_args}"}"
                fi
                base_cmd="node${interpreter_args:+" ${interpreter_args}"} ${run_target}"
                ;;
            tsx | *)
                base_cmd="tsx${interpreter_args:+" ${interpreter_args}"} ${run_target}"
                ;;
            bun)
                base_cmd="bun${interpreter_args:+" ${interpreter_args}"} ${run_target}"
                ;;
            deno)
                interpreter_args="--no-code-cache --no-prompt --allow-env --allow-read=./ --allow-write=./ --allow-net --deny-net=127.0.0.1,172.17.0.1,$(hostname -I)${interpreter_args:+" ${interpreter_args}"}"
                base_cmd="deno run${interpreter_args:+" ${interpreter_args}"} ${run_target}"
                ;;
            ts-node)
                interpreter_args="-T -O '{\"target\":\"esnext\"}'${interpreter_args:+" ${interpreter_args}"}"
                base_cmd="ts-node${interpreter_args:+" ${interpreter_args}"} ${run_target}"
                ;;
            esac
            ;;
        Python)
            if [[ "${CLI_CONFIG_ENABLE_PYTHON_UV}" == "true" ]]; then
                base_cmd="uv run -- -u${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            else
                base_cmd="python3 -u${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            fi
            ;;
        Go)
            base_cmd="go run${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            ;;
        Lua)
            base_cmd="lua${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            ;;
        Ruby)
            base_cmd="ruby${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            ;;
        Rust)
            base_cmd="cargo script${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            ;;
        Perl)
            base_cmd="perl${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            ;;
        C)
            base_cmd="gcc -o ${FileName}${interpreter_args:+" ${interpreter_args}"} ${run_target} && ./${FileName}"
            ;;
        Shell)
            base_cmd="bash${interpreter_args:+" ${interpreter_args}"} ${run_target}"
            ;;
        esac
        if [[ "${script_args}" ]]; then
            base_cmd="${base_cmd} ${script_args}"
        fi
        base_cmd="${base_cmd} 2>&1" # 重定向错误输出
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
        pm2 stop "${RUN_OPTION_DAEMON_NAME:-$FileName}" >/dev/null 2>&1
        pm2 flush "${RUN_OPTION_DAEMON_NAME:-$FileName}" >/dev/null 2>&1
        pm2 delete "${RUN_OPTION_DAEMON_NAME:-$FileName}" >/dev/null 2>&1
        # 记录执行开始时间
        _record_log_start_title "守护进程启动"
        # 启动（此处特殊，需要替换命令中的日志标记）
        run_cmd="${run_cmd//<LogFilePath>/${LogFilePath}}"
        # echo "${run_cmd}"
        bash -c "${run_cmd}"

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
        # 执行
        if [[ $RUN_OPTION_CONCURRENT_TASKS -eq 1 ]]; then
            _concurrent_dispatch "${run_cmd}" "${LogFilePath}"
        else
            for ((i = 1; i <= $RUN_OPTION_CONCURRENT_TASKS; i++)); do
                _concurrent_dispatch "${run_cmd}" "${LogPath}/${LogFileName}-t${i}.log"
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
    # 记录编排进程 PID（供 stop 命令终止进程树）
    local _run_pid_file="${LogTmpDir}/.run_${FileName}_$$.pid"
    make_dir "${LogTmpDir}"
    echo $$ >"${_run_pid_file}"
    # 正常退出时清理 PID 文件
    trap 'rm -f "${_run_pid_file}"' EXIT
    # 禁用 Core Dump
    ulimit -c 0 >/dev/null 2>&1
    # 进入脚本所在目录
    cd ${FileDir}
    # 创建日志存储目录
    if [[ "${RUN_OPTION_NO_LOG}" != "true" ]]; then
        make_dir "${LogPath}"
    fi
    # 定义运行次数
    local run_times=1 # 注：使用并发时必定为1
    # 循环运行（命令选项）
    [[ "${RUN_OPTION_LOOP}" == "true" ]] && run_times=$((RUN_OPTION_LOOP_TIMES + 1))
    # 定义基准命令
    local base_cmd=""
    define_base_command

    # 初始化线程池（命令选项）
    local _thread_task_index=0
    local _thread_task_total=0
    if [[ "${RUN_OPTION_THREAD}" == "true" ]]; then
        # 计算任务总数
        local _outer_count=1
        if [[ "${RUN_OPTION_RECOMBINE_ENV_GROUP}" == "true" ]]; then
            _outer_count=$(echo "${RUN_OPTION_RECOMBINE_ENV_ARG}" | awk -F '@' '{print NF}')
        elif [[ "${RUN_OPTION_SPLIT_ENV}" == "true" ]]; then
            _outer_count=$(echo "${RUN_OPTION_SPLIT_ENV_ORIGINAL_VALUE}" | awk -F "${RUN_OPTION_SPLIT_ENV_SEPARATOR}" '{print NF}')
        fi
        _thread_task_total=$((_outer_count * run_times * RUN_OPTION_CONCURRENT_TASKS))
        _thread_pool_init ${RUN_OPTION_THREAD_NUM}
        # Ctrl+C 终止线程池控制进程，已运行的任务在后台继续
        trap '_thread_pool_destroy; rm -f "${_run_pid_file}"; exit 130' INT
        echo ''
        # echo -e "\n$WORKING [$(_print_datetime)] 并发线程池已初始化（线程数：${BLUE}${RUN_OPTION_THREAD_NUM}${PLAIN}，任务总数：${BLUE}${_thread_task_total}${PLAIN}）"
    fi

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
                [ $env_index -gt 1 ] && echo -e "\n[$(_print_datetime)] 下一运行任务\n" >>${LogFilePath}
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

    # 线程池模式：等待所有后台任务完成并清理资源
    if [[ "${RUN_OPTION_THREAD}" == "true" ]]; then
        wait
        _thread_pool_destroy
        trap 'rm -f "${_run_pid_file}"' EXIT
    fi

    ## 打印
    # 守护进程（命令选项）
    if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
        echo -e "\n暂停任务 ${BLUE}pm2 stop ${RUN_OPTION_DAEMON_NAME:-$FileName}${PLAIN}\n移除任务 ${BLUE}pm2 delete ${RUN_OPTION_DAEMON_NAME:-$FileName}${PLAIN}"
        echo -e "\n$COMPLETE 已${operation_title} ${BLUE}${RUN_OPTION_DAEMON_NAME:-$FileName}${PLAIN} 守护进程，日志位于 ${BLUE}${RUN_OPTION_DAEMON_LOG_FILE:-$LogFilePath}${PLAIN}\n"
    # 后台运行 & 并发运行
    elif [[ "${RUN_OPTION_BACKGROUND}" == "true" ]] || [[ "${RUN_OPTION_CONCURRENT}" == "true" ]]; then
        if [[ "${RUN_OPTION_THREAD}" == "true" ]]; then
            echo -e "[$(_print_datetime)] All done!"
            echo -e "\n$COMPLETE 所有任务已完成（线程数：${BLUE}${RUN_OPTION_THREAD_NUM}${PLAIN}，任务总数：${BLUE}${_thread_task_total}${PLAIN}），日志目录 ${BLUE}$(echo "${LogPath}" | awk -F "${RootDir}/" '{print$2}')${PLAIN}\n"
        else
            echo -e "\n$COMPLETE 已部署所有任务于后台运行，如需查询代码运行记录请前往 ${BLUE}$(echo "${LogPath}" | awk -F "${RootDir}/" '{print$2}')${PLAIN} 目录查看最新日志\n"
        fi
    fi

    # 判断远程脚本执行后是否删除
    if [[ "${RUN_REMOTE}" == "true" && "${CLI_CONFIG_ENABLE_AUTO_DELETE_REMOTE_FILE}" == "true" ]]; then
        rm -rf "${FileDir}/${FileName}.${FileSuffix}"
    fi
}
