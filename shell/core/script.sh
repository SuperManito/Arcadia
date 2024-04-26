#!/bin/bash
## Modified: 2024-04-20

## 查找代码文件
# 通过各种判断将得到的必要信息传给接下来运行的函数或命令
#   "FileName"     代码文件名称（去后缀）
#   "FileSuffix"   代码文件后缀名
#   "FileType"     代码文件类型
#   "FileDir"      代码文件所在目录（绝对路径）
# 不论何种匹配方式或查找方式，当未指定代码文件类型但存在同名代码文件时执行优先级为 Node.js > Python > TypeScript > Shell
function find_script() {
    local input_content=$1                                                                                          # 传入内容
    local supported_file_types=("js" "mjs" "cjs" "py" "ts" "go" "c" "sh")                                           # 支持的代码文件类型
    local supported_file_type_names=("JavaScript" "JavaScript" "JavaScript" "Python" "TypeScript" "Go" "C" "Shell") # 支持的代码文件类型名称
    FileName=""
    FileDir=""
    FileType=""

    ## 匹配指定路径下的代码文件
    function match_path_file() {
        local absolute_path tmp_pwd tmp_file_name tmp_file_dir
        ## 判定路径格式
        echo $1 | grep "/$" -q
        if [ $? -eq 0 ]; then
            output_error "请输入正确的代码文件路径！"
        fi
        ## 判定传入的是绝对路径还是相对路径
        echo ${input_content} | grep "^$RootDir" -q
        if [ $? -eq 0 ]; then
            absolute_path=${input_content}
        else
            echo ${input_content} | grep "\.\./" -q
            if [ $? -eq 0 ]; then
                tmp_pwd=$(pwd | sed "s|/$(pwd | awk -F '/' '{printf$NF}')||g")
                absolute_path=$(echo "${input_content}" | sed "s|\.\./|${tmp_pwd}/|g")
            else
                local tmp_dir_name=$(echo ${input_content} | awk -F '/' '{printf$1}')
                if [ -d "$RepoDir/$tmp_dir_name" ]; then
                    absolute_path=$(echo "${input_content}" | sed "s|^|$RepoDir/|g")
                else
                    if [[ $(pwd) == "/root" ]]; then
                        absolute_path=$(echo "${input_content}" | sed "s|\.\/||g; s|^|$RootDir/|g")
                    else
                        absolute_path=$(echo "${input_content}" | sed "s|\.\/||g; s|^|$(pwd)/|g")
                    fi
                fi
            fi
            echo ${input_content} | grep "\.\./" -q
        fi
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
            check_moudules $FileDir
            ## 定义日志路径
            if [[ $(echo ${absolute_path} | awk -F '/' '{print$3}') == "repo" ]]; then
                LogPath="$LogDir/$(echo ${absolute_path} | awk -F '/' '{print$4}')_${FileName}"
            elif [[ $(echo ${absolute_path} | awk -F '/' '{print$3}') == "raw" ]]; then
                LogPath="$LogDir/raw_${FileName}"
            else
                LogPath="$LogDir/${FileName}"
            fi
            make_dir ${LogPath}
        else
            output_error "在 ${BLUE}${absolute_path%/*}${PLAIN} 目录未检测到 ${BLUE}${absolute_path##*/}${PLAIN} 代码文件的存在，请重新确认！"
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
            check_moudules $FileDir
            ## 定义日志路径
            LogPath="$LogDir/${FileName}"
        else
            output_error "在 ${BLUE}$ScriptsDir${PLAIN} 根目录以及 ${BLUE}./backUp${PLAIN} ${BLUE}./utils${PLAIN} 二个子目录下均未检测到 ${BLUE}${input_content}${PLAIN} 代码文件的存在，请重新确认！"
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
                tmp_title="使用代理"
            else
                output_error "下载代理命令选项仅支持位于 GitHub 仓库的文件！"
            fi
        else
            input_content="${Tmp}"
            tmp_title=""
        fi

        ## 拉取代码文件
        echo -en "\n$WORKING 正在从远程仓库${tmp_title}下载 ${BLUE}${tmp_file_name}${PLAIN} 代码文件..."
        wget -q --no-check-certificate "${input_content}" -O "$ScriptsDir/${tmp_file_name}.new" -T 30

        ## 判定拉取结果
        if [[ $? -eq 0 ]]; then
            echo ''
            mv -f "$ScriptsDir/${tmp_file_name}.new" "$ScriptsDir/${tmp_file_name}"
            echo ''
            ## 等待动画
            local spin=('.   ' '..  ' '... ' '....')
            local n=0
            tput civis
            while (true); do
                ((n++))
                echo -en "$COMPLETE 下载完毕，倒计时 3 秒后开始执行${spin[$((n % 4))]}${PLAIN}" "\r"
                sleep 0.3
                [ $n = 10 ] && echo -e "\033[?25h\n${PLAIN}" && break
            done
            tput cnorm
            FileName=${tmp_file_name%.*}
            FileDir=$ScriptsDir
            ## 添加依赖文件
            check_moudules $FileDir
            ## 定义日志路径
            LogPath="$LogDir/${FileName}"
            make_dir ${LogPath}
            RUN_REMOTE="true"
        else
            echo ''
            [ -f "$ScriptsDir/${tmp_file_name}.new" ] && rm -rf "$ScriptsDir/${tmp_file_name}.new"
            echo -e "\n$FAIL 代码文件 ${tmp_file_name} 下载异常，请检查网络连通性并对目标 URL 地址是否正确进行验证！\n"
            exit ## 终止退出
        fi
    }

    ## 检测环境，添加依赖文件
    function check_moudules() {
        local work_dir=$1
        if [[ "${FileType}" == "JavaScript" || "${FileType}" == "TypeScript" ]]; then
            ## 拷贝核心组件
            local core_files=""
            for file in ${core_files}; do
                [ ! -f $work_dir/$file ] && cp -rf $UtilsDir/$file $work_dir
            done
            ## 拷贝推送通知模块
            import_config_not_check
            if [[ "${EnableCustomNotify}" == "true" ]] && [ -s $FileSendNotifyUser ]; then
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
            match_remote_file
        else
            match_path_file
        fi
    else
        match_scripts_file
    fi

    ## 检测代码文件运行环境
    # Python
    if [[ "${FileType}" == "Python" ]] && [[ -z "$(command -v python3)" ]]; then
        output_error "当前未安装 ${BLUE}Python 3${PLAIN} 运行环境！"
    fi
    # TypeScript
    if [[ "${FileType}" == "TypeScript" ]] && [[ -z "$(command -v ts-node)" ]]; then
        output_error "当前未安装 ${BLUE}TypeScript${PLAIN} 运行环境！"
    fi
    # Go
    if [[ "${FileType}" == "Go" ]] && [[ -z "$(command -v go)" ]]; then
        output_error "当前未安装 ${BLUE}Go${PLAIN} 运行环境！"
    fi
    # C
    if [[ "${FileType}" == "C" ]] && [[ -z "$(command -v gcc)" ]]; then
        output_error "当前未安装 ${BLUE}C${PLAIN} 运行环境！"
    fi
}

# 根据代码文件名后缀匹配语言类型
function match_script_type() {
    case "$1" in
    js | mjs | cjs)
        FileType="JavaScript"
        ;;
    py)
        FileType="Python"
        ;;
    ts)
        FileType="TypeScript"
        ;;
    go)
        FileType="Go"
        ;;
    c)
        FileType="C"
        ;;
    sh)
        FileType="Shell"
        ;;
    *)
        output_error "项目不支持运行 ${BLUE}.$1${PLAIN} 类型的代码文件！"
        ;;
    esac
}
