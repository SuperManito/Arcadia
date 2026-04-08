#!/bin/bash

## 查找代码文件
# 通过各种判断将得到的必要信息传给接下来运行的函数或命令
#   "FileName"     代码文件名称（去后缀）
#   "FileSuffix"   代码文件后缀名
#   "FileType"     代码文件类型
#   "FileDir"      代码文件所在目录（绝对路径）
# 不论何种匹配方式或查找方式，当未指定代码文件类型但存在同名代码文件时执行优先级为 Node.js > Python > TypeScript > Shell
function find_script() {
    # 根据代码文件名后缀匹配语言类型
    function match_script_type() {
        local file_extension="$1"
        for i in "${!supported_file_types[@]}"; do
            if [[ "$file_extension" == "${supported_file_types[$i]}" ]]; then
                FileType="${supported_file_type_names[$i]}"
                return
            fi
        done
        output_error "项目不支持运行 ${BLUE}.$1${PLAIN} 类型的代码文件！"
    }

    # 传入内容
    local input_content=$1
    # 支持的代码文件类型后缀
    local supported_file_types=("js" "mjs" "cjs" "py" "ts" "mts" "cts" "go" "lua" "rb" "rs" "pl" "c" "sh")
    # 支持的代码文件类型名称
    local supported_file_type_names=("JavaScript" "JavaScript" "JavaScript" "Python" "TypeScript" "TypeScript" "TypeScript" "Go" "Lua" "Ruby" "Rust" "Perl" "C" "Shell")
    FileName=""
    FileDir=""
    FileType=""

    ## 匹配指定路径下的代码文件
    function match_path_file() {
        local absolute_path tmp_path tmp_file_name tmp_file_dir
        ## 判定路径格式
        echo $1 | grep "/$" -q
        if [ $? -eq 0 ]; then
            output_error "请输入正确的代码文件路径！"
        fi
        ## 转换为绝对路径
        tmp_path="$(get_absolute_path "${input_content}")"
        absolute_path="${tmp_path:-"${input_content}"}"
        ## 判定传入是否含有后缀格式
        tmp_file_name=${absolute_path##*/}
        tmp_file_dir=${absolute_path%/*}
        echo ${tmp_file_name} | grep "\." -q
        if [ $? -eq 0 ]; then
            if [ -f ${absolute_path} ]; then
                # 判断并定义代码文件类型
                FileSuffix=${tmp_file_name##*.}
                match_script_type "${FileSuffix}"
                FileName=${tmp_file_name%.*}
                FileDir=${tmp_file_dir}
            fi
        else
            local index
            for index in ${!supported_file_types[*]}; do
                if [ -f "${tmp_file_dir}/${tmp_file_name}.${supported_file_types[$index]}" ]; then
                    FileName="${tmp_file_name}"
                    FileType="${supported_file_type_names[$index]}"
                    FileDir="${tmp_file_dir}"
                    break
                fi
            done
        fi

        ## 判定变量是否存在否则报错终止退出
        if [ -n "${FileName}" ] && [ -n "${FileDir}" ]; then
            ## 添加依赖文件
            check_modules $FileDir
            local primary_path secondary_path
            ## 定义日志路径
            if [[ $(echo ${absolute_path} | awk -F '/' '{print$3}') == "repo" ]]; then
                primary_path="$(echo ${absolute_path} | awk -F '/' '{print$4}')"
                secondary_path="${FileName}"
                LogPath="${LogDir}/${primary_path}/${secondary_path}"
                make_dir "${LogDir}/${primary_path}"
            elif [[ $(echo ${absolute_path} | awk -F '/' '{print$3}') == "raw" ]]; then
                primary_path="raw"
                secondary_path="${FileName}"
                LogPath="${LogDir}/${primary_path}/${secondary_path}"
                make_dir "${LogDir}/${primary_path}"
            else
                LogPath="${LogDir}/${FileName}"
            fi
        else
            output_error "在 ${BLUE}${absolute_path%/*}${PLAIN} 目录下未检测到 ${BLUE}${absolute_path##*/}${PLAIN} 代码文件的存在，请重新确认！"
        fi
    }

    ## 匹配 scripts 目录下的代码文件
    function match_scripts_file() {
        local tmp_file_name tmp_seek_dir tmp_seek_extension
        ## 定义目录范围
        tmp_seek_dir="$ScriptsDir"
        ## 定义后缀格式
        tmp_seek_extension="js mjs cjs py ts sh"

        ## 判定传入内容是否含有后缀格式
        ## 如果存在后缀格式则为精确查找，否则为模糊查找，仅限关于代码文件名称的定位目录除外

        ## 判定是否传入了后缀格式
        echo "${input_content}" | grep "\." -q
        if [ $? -eq 0 ]; then
            ## 精确查找
            # 判断并定义代码文件类型
            FileSuffix=${input_content##*.}
            for dir in ${tmp_seek_dir}; do
                if [ -f ${dir}/${input_content} ]; then
                    FileName=${input_content%.*}
                    FileDir=${dir}
                    break
                fi
            done

        else
            ## 模糊查找
            tmp_file_name="${input_content}"
            local index
            for dir in ${tmp_seek_dir}; do
                for index in ${!supported_file_types[*]}; do
                    if [ -f "${dir}/${tmp_file_name}.${supported_file_types[$index]}" ]; then
                        FileName="${tmp_file_name}"
                        FileDir="${dir}"
                        FileSuffix="${supported_file_types[$index]}"
                        break 2
                    fi
                done
            done
        fi

        ## 判定变量是否存在否则报错终止退出
        if [ -n "${FileName}" ] && [ -n "${FileDir}" ]; then
            # 判断并定义代码文件类型
            match_script_type "${FileSuffix}"
            ## 添加依赖文件
            check_modules $FileDir
            ## 定义日志路径
            LogPath="$LogDir/${FileName}"
        else
            output_error "在 ${BLUE}$ScriptsDir${PLAIN} 目录下未检测到 ${BLUE}${input_content}${PLAIN} 代码文件的存在，请重新确认！"
        fi
    }

    ## 匹配位于远程仓库的代码文件
    function match_remote_file() {
        local tmp_file_name=${input_content##*/}

        # 判断并定义代码文件类型
        FileSuffix=${tmp_file_name##*.}
        if [ -z "${FileSuffix}" ]; then
            output_error "未能识别脚本类型，请检查链接地址是否正确！"
        fi
        match_script_type "${FileSuffix}"

        ## 仓库原始文件地址自动纠正
        import utils/request
        if [[ "$(get_correct_raw_url "${input_content}")" ]]; then
            input_content="$(get_correct_raw_url "${input_content}")"
        fi
        ## 判定是否使用下载代理参数
        local tmp_title=""
        if [[ "${RUN_OPTION_DOWNLOAD_PROXY}" == true ]]; then
            echo "${input_content}" | grep "raw\.githubusercontent\.com/" -q
            if [ $? -eq 0 ]; then
                local repo_branch=$(echo "${input_content}" | sed "s/https:\/\/raw\.githubusercontent\.com\///g" | awk -F '/' '{print$3}')
                input_content=$(echo "${input_content}" | sed "s|raw\.githubusercontent\.com|cdn\.jsdelivr\.net\/gh|g; s|\/${repo_branch}\/|\@${repo_branch}\/|g")
                tmp_title="使用 CDN "
            else
                output_error "下载代理命令选项仅支持位于 GitHub 仓库的文件！"
            fi
        fi
        ## 拉取代码文件
        echo -en "\n$WORKING 正在${tmp_title}下载 ${BLUE}${tmp_file_name}${PLAIN} ..."
        wget -q --no-check-certificate "${input_content}" -O "$ScriptsDir/${tmp_file_name}.new" -T 30
        ## 判定拉取结果
        if [[ $? -eq 0 ]]; then
            echo ''
            mv -f "$ScriptsDir/${tmp_file_name}.new" "$ScriptsDir/${tmp_file_name}"
            echo ''
            echo -e "$COMPLETE 下载完毕，开始执行\n"
            FileName=${tmp_file_name%.*}
            FileDir=$ScriptsDir
            ## 添加依赖文件
            check_modules $FileDir
            ## 定义日志路径
            LogPath="${LogDir}/${FileName}"
            RUN_REMOTE="true"
        else
            echo ''
            [ -f "${ScriptsDir}/${tmp_file_name}.new" ] && rm -rf "$ScriptsDir/${tmp_file_name}.new"
            output_fail "代码文件 ${tmp_file_name} 下载异常，请检查网络连通性并对目标 URL 地址是否正确进行验证！"
        fi
    }

    ## 检测环境，添加依赖文件
    function check_modules() {
        local work_dir=$1
        if [[ "${FileType}" == "JavaScript" || "${FileType}" == "TypeScript" ]]; then
            ## 拷贝推送通知模块
            import_config_not_check
            if [[ "${CLI_CONFIG_ENABLE_CUSTOM_NOTIFY}" == "true" ]] && [ -s $FileSendNotifyUser ]; then
                cp -rf $FileSendNotifyUser $work_dir
            else
                cp -rf $FileSendNotify $work_dir
            fi
        fi
    }

    ## 根据传入内容判断匹配方式（主要）
    echo ${input_content} | grep "/" -q
    if [ $? -eq 0 ]; then
        ## 判定传入的是路径还是URL
        echo ${input_content} | grep -Eq "^https?:"
        if [ $? -eq 0 ]; then
            if [[ "${RUN_OPTION_DAEMON}" == "true" ]]; then
                output_error "守护进程模式不支持运行远程文件，请先自行下载到本地后再运行！"
            fi
            match_remote_file
        else
            match_path_file
        fi
    else
        match_scripts_file
    fi
}

function ensure_runtime_available() {
    function _check_interpreter_exist {
        local interpreter_type="$1"
        local interpreter_name="$2"
        if ! command -v "${interpreter_type}" &>/dev/null; then
            output_error "当前尚未安装 ${BLUE}${interpreter_name}${PLAIN}！\n\n详见文档：https://arcadia.cool/docs/environment#安装语言环境"
        fi
    }

    # 运行时选项互斥检测（这些选项中最多只能指定一个）
    # function check_mutex_vars() {
    #     local count=0
    #     local selected=()
    #     while [ $# -gt 0 ]; do
    #         local varname="$1"
    #         shift
    #         local optname="$1"
    #         shift
    #         if [[ "${!varname}" == "true" ]]; then
    #             ((count++))
    #             selected+=("${optname}")
    #         fi
    #     done
    #     if [[ ${count} -gt 1 ]]; then
    #         local joined=""
    #         for i in "${!selected[@]}"; do
    #             if [[ ${i} -eq 0 ]]; then
    #                 joined="${BLUE}${selected[$i]}${PLAIN}"
    #             else
    #                 joined="${joined}，${BLUE}${selected[$i]}${PLAIN}"
    #             fi
    #         done
    #         output_error "命令选项 ${joined} 不可同时使用！"
    #     fi
    # }
    # check_mutex_vars \
    #     "RUN_OPTION_USE_DENO" "--deno" \
    #     "RUN_OPTION_USE_BUN" "--bun" \
    #     "RUN_OPTION_USE_TS_NODE" "--ts-node" \
    #     "RUN_OPTION_USE_NODE" "--node" \
    #     "RUN_OPTION_USE_TSX" "--tsx"

    ## 检测代码文件运行环境
    case "${FileType}" in
    "JavaScript" | "TypeScript")
        # 确定 JS/TS 执行方式（命令选项优先级高于 CLI 配置）
        JS_AND_TS_EXECUTE_METHOD=""
        if [[ "${RUN_OPTION_USE_BUN}" == "true" ]]; then
            JS_AND_TS_EXECUTE_METHOD="bun"
        elif [[ "${RUN_OPTION_USE_DENO}" == "true" ]]; then
            JS_AND_TS_EXECUTE_METHOD="deno"
        elif [[ "${RUN_OPTION_USE_TSX}" == "true" ]]; then
            JS_AND_TS_EXECUTE_METHOD="tsx"
        elif [[ "${RUN_OPTION_USE_TS_NODE}" == "true" ]]; then
            JS_AND_TS_EXECUTE_METHOD="ts-node"
        elif [[ "${RUN_OPTION_USE_NODE}" == "true" ]]; then
            JS_AND_TS_EXECUTE_METHOD="node"
        else
            if [[ "${FileType}" == "JavaScript" ]]; then
                if [[ "${CLI_CONFIG_DEFAULT_JS_RUNTIME}" =~ ^(node|deno|bun|tsx|ts-node)$ ]]; then
                    JS_AND_TS_EXECUTE_METHOD="${CLI_CONFIG_DEFAULT_JS_RUNTIME}"
                else
                    JS_AND_TS_EXECUTE_METHOD="node" # 默认
                fi
            elif [[ "${FileType}" == "TypeScript" ]]; then
                if [[ "${CLI_CONFIG_DEFAULT_TS_RUNTIME}" =~ ^(node|deno|bun|tsx|ts-node)$ ]]; then
                    JS_AND_TS_EXECUTE_METHOD="${CLI_CONFIG_DEFAULT_TS_RUNTIME}"
                else
                    JS_AND_TS_EXECUTE_METHOD="tsx" # 默认
                fi
            fi
        fi
        [[ "${JS_AND_TS_EXECUTE_METHOD}" == "deno" ]] && _check_interpreter_exist "deno" "Deno 运行时"
        [[ "${JS_AND_TS_EXECUTE_METHOD}" == "bun" ]] && _check_interpreter_exist "bun" "Bun 运行时"
        [[ "${JS_AND_TS_EXECUTE_METHOD}" == "ts-node" ]] && _check_interpreter_exist "ts-node" "ts-node"
        [[ "${JS_AND_TS_EXECUTE_METHOD}" == "tsx" ]] && _check_interpreter_exist "tsx" "TypeScript Execute (tsx)"
        # [[ "${RUN_OPTION_USE_NODE}" == "true" ]] && _check_interpreter_exist "node" "Node.js" # 当前默认安装，不做检查
        ;;
    "Python")
        if [[ "${CLI_CONFIG_ENABLE_PYTHON_UV}" == "true" ]]; then
            _check_interpreter_exist "uv" "uv"
        else
            _check_interpreter_exist "python3" "Python 3"
        fi
        ;;
    "Go")
        _check_interpreter_exist "go" "Go"
        ;;
    "Lua")
        _check_interpreter_exist "lua" "Lua"
        ;;
    "Ruby")
        _check_interpreter_exist "ruby" "Ruby"
        ;;
    "Rust")
        if ! command -v rustc &>/dev/null || ! command -v cargo &>/dev/null; then
            output_error "当前未安装 ${BLUE}Rust${PLAIN}！"
        fi
        ;;
    "C")
        _check_interpreter_exist "gcc" "C"
        ;;
    esac
    # "Perl")
    #   _check_interpreter_exist "perl" "Perl"
    #   ;;
}
