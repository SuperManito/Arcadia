#!/bin/bash
## Modified: 2025-08-31

## 一键添加代码仓库配置
# repo <name> <url> <branch> [--options]
function command_repo() {
    local name url branch enable isPrivate authMethod sshAlias sshHostName sshPrivateKeyPath httpUsername httpPassword updateTaskList scriptsPath scriptsType whiteList blackList autoDisable addNotify delNotify
    # 定义临时文件
    local tmp_file="${RootDir}/.repo.yml"

    ## 处理命令选项
    function handle_options() {
        case $# in
        0)
            print_command_help repo
            exit
            ;;
        1)
            case "$1" in
            -h | --help)
                print_command_help repo
                exit
                ;;
            *)
                output_error "缺少必须提供的 url 和 branch 参数！"
                ;;
            esac
            ;;
        2)
            output_error "缺少必须提供的 branch 参数！"
            ;;
        *)
            name="$1"
            shift
            url="$1"
            shift
            branch="$1"
            shift

            ## 判断命令选项
            while [ $# -gt 0 ]; do
                # 通用判断
                if [ "$2" ]; then
                    echo "$2" | grep -Eq "^--"
                    if [ $? -eq 0 ]; then
                        output_error "检测到 ${BLUE}$1${PLAIN} 为无效命令选项，请在该命令选项后指定选项值！"
                    fi
                else
                    output_error "检测到 ${BLUE}$1${PLAIN} 为无效命令选项，请在该命令选项后指定选项值！"
                fi

                case "$1" in
                --enable)
                    echo "$2" | grep -Eqw "true|false"
                    if [ $? -eq 0 ]; then
                        enable="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                    fi
                    ;;
                --isPrivate)
                    echo "$2" | grep -Eqw "true|false"
                    if [ $? -eq 0 ]; then
                        isPrivate="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                    fi
                    ;;
                --authMethod)
                    echo "$2" | grep -Eqw "ssh|http"
                    if [ $? -eq 0 ]; then
                        authMethod="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入 ssh 或 http！"
                    fi
                    ;;
                --sshAlias)
                    echo "$2" | grep -Eq "^[[:alnum:]_-]+$"
                    if [ $? -eq 0 ]; then
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入字符串！"
                    else
                        sshAlias="$2"
                        shift
                    fi
                    ;;
                --sshHostName)
                    sshHostName="$2"
                    shift
                    ;;
                --sshPrivateKeyPath)
                    sshPrivateKeyPath="$2"
                    shift
                    ;;
                --httpUsername)
                    httpUsername="$2"
                    shift
                    ;;
                --httpPassword)
                    httpPassword="$2"
                    shift
                    ;;
                --updateTaskList)
                    echo "$2" | grep -Eqw "true|false"
                    if [ $? -eq 0 ]; then
                        updateTaskList="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                    fi
                    ;;
                --scriptsPath)
                    scriptsPath="$2"
                    shift
                    ;;
                --scriptsType)
                    scriptsType="$2"
                    shift
                    ;;
                --whiteList)
                    whiteList="$2"
                    shift
                    ;;
                --blackList)
                    blackList="$2"
                    shift
                    ;;
                --autoDisable)
                    echo "$2" | grep -Eqw "true|false"
                    if [ $? -eq 0 ]; then
                        autoDisable="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                    fi
                    ;;
                --addNotify)
                    echo "$2" | grep -Eqw "true|false"
                    if [ $? -eq 0 ]; then
                        addNotify="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                    fi
                    ;;
                --delNotify)
                    echo "$2" | grep -Eqw "true|false"
                    if [ $? -eq 0 ]; then
                        delNotify="$2"
                        shift
                    else
                        output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                    fi
                    ;;
                *)
                    output_error "检测到 ${BLUE}$1${PLAIN} 为无效命令选项，请确认后重新输入！"
                    ;;
                esac
                shift
            done
            ;;
        esac

        ## 处理认证凭据
        if [[ "${authMethod}" ]]; then
            case "${authMethod}" in
            ssh)
                if [ -z "${sshAlias}" ] || [ -z "${sshHostName}" ] || [ -z "${sshPrivateKeyPath}" ]; then
                    output_error "设置私有仓库 SSH 访问凭据时需提供配置别名、主机地址和私钥文件路径！"
                fi
                ;;
            http)
                if [ -z "${httpUsername}" ] || [ -z "${httpPassword}" ]; then
                    output_error "设置私有仓库 HTTP 访问凭据时需提供用户名和密码！"
                fi
                ;;
            esac
        fi
    }

    # 生成配置文件模板
    function create_template() {
        local auth_content=''
        if [[ "${authMethod}" ]]; then
            local auth_config=''
            case "${authMethod}" in
            ssh)
                auth_config='"sshConfig": { "alias": "'"${sshAlias}"'", "host": "'"${sshHostName}"'", "privateKeyPath": "'"${sshPrivateKeyPath}"'" }'
                ;;
            http)
                auth_config='"httpAuth": { "username": "'"${httpUsername}"'", "password": "'"${httpPassword}"'" }'
                ;;
            esac
            auth_content=' "authSettings": { "method": "'"${authMethod}"'", '"${auth_config}"' },'
        fi

        echo '{ "name": "'"${name}"'", "url": "'"${url}"'", "branch": "'"${branch}"'", "enable": true, "isPrivate": false,'"${auth_content}"' "cronSettings": { "updateTaskList": false, "scriptsPath": "", "scriptsType": ["js"], "whiteList": "", "blackList": "", "autoDisable": false, "addNotify": true, "delNotify": true } }' | jq | yq -y >$tmp_file
        # 插入缩进空格
        local line_sum="$(cat $tmp_file | grep "" -c)"
        for ((i = 1; i <= $line_sum; i++)); do
            [ $i -eq 1 ] && sed -i "1s/^/  - /g" $tmp_file || sed -i "${i}s/^/    /g" $tmp_file
        done

        # 替换用户配置
        [ "${enable}" ] && sed -i "s|enable: true|enable: ${enable}|g" $tmp_file
        [ "${isPrivate}" ] && sed -i "s|isPrivate: false|isPrivate: ${isPrivate}|g" $tmp_file
        [ "${updateTaskList}" ] && sed -i "s|updateTaskList: false|updateTaskList: ${updateTaskList}|g" $tmp_file
        [ "${scriptsPath}" ] && sed -i "s|scriptsPath: ''|scriptsPath: \"${scriptsPath}\"|g" $tmp_file
        [ "${whiteList}" ] && sed -i "s@whiteList: ''@whiteList: \'$(echo "${whiteList}" | sed -e 's/[]\/$*.^[]/\\&/g; s/@/\@/g')\'@g" $tmp_file
        [ "${blackList}" ] && sed -i "s@blackList: ''@blackList: \'$(echo "${blackList}" | sed -e 's/[]\/$*.^[]/\\&/g; s/@/\@/g')\'@g" $tmp_file
        [ "${autoDisable}" ] && sed -i "s|autoDisable: false|autoDisable: ${autoDisable}|g" $tmp_file
        [ "${addNotify}" ] && sed -i "s|addNotify: true|addNotify: ${addNotify}|g" $tmp_file
        [ "${delNotify}" ] && sed -i "s|delNotify: true|delNotify: ${delNotify}|g" $tmp_file
        # 特殊处理文件格式（数组）
        [ ! "${scriptsType}" ] && scriptsType="js|py|ts"
        scriptsType="$(echo "${scriptsType}" | sed -e 's/|/ /g')"
        local scriptsTypeFormat
        echo "${scriptsType}" | grep -q " "
        if [ $? -eq 0 ]; then
            for i in ${scriptsType}; do
                if [ "$scriptsTypeFormat" ]; then
                    scriptsTypeFormat="${scriptsTypeFormat}\n        - ${i}"
                else
                    scriptsTypeFormat="        - ${i}"
                fi
            done
            sed -i "s|        - js|${scriptsTypeFormat}|g" $tmp_file
        else
            sed -i "s|        - js|        - ${scriptsType}|g" $tmp_file
        fi
        echo -e "\n$TIP 自动生成的配置内容如下：\n"
        cat $tmp_file | sed "s/^  //g"
        echo ''
    }

    # 保存配置（写入至配置文件）
    function save_conf() {
        local LinesInfo="$(cat $FileSyncConfUser | grep -n "" | grep -Ev "^[0-9]{1,4}:  ")"
        # 判断是否有设置 repo 键值对
        echo "${LinesInfo}" | grep -Eq ":repo:$"
        if [ $? -eq 0 ]; then
            # 判断是否在最后
            if [[ "$(echo "${LinesInfo}" | grep -E ":repo:$" -A 1 | tail -n 1 | awk -F ':' '{print$2}')" == "repo" ]]; then
                echo -e "\n$(cat $tmp_file)\n" >>$FileSyncConfUser
            else
                local writeLineNum=$(echo "${LinesInfo}" | grep -E ":repo:$" -A 1 | tail -n 1 | awk -F ':' '{print$1}')
                writeLineNum=$(($writeLineNum - 1))
                sed -i "$writeLineNum r $tmp_file" $FileSyncConfUser
            fi
        else
            echo -e "repo:\n$(cat $tmp_file)\n" >>$FileSyncConfUser
        fi
        if [ $? -eq 0 ]; then
            echo -e "$SUCCESS 已写入至 ${BLUE}${FileSyncConfUser##*/}${PLAIN} 配置文件，你可以在之后执行更新命令 ${BLUE}${ArcadiaCmd} update repo${PLAIN} 来使该配置生效\n"
        else
            echo -e "$ERROR 已写入至 ${BLUE}${FileSyncConfUser##*/}${PLAIN} 配置文件失败！\n"
        fi
    }

    # 处理命令选项
    handle_options "$@"
    # 判断重复性
    cat $FileSyncConfUser | grep -Eq "url: [\"\']?${url}[\"\']?"
    [ $? -eq 0 ] && output_error "检测到该配置已存在，请勿重复添加！"
    # 生成配置文件模板
    create_template
    # 保存配置
    save_conf
    # 删除临时文件
    [ -f $tmp_file ] && rm -rf $tmp_file
}
