#!/bin/bash
## Modified: 2024-04-18

## 一键添加远程文件配置
# repo <name> <url> [--options]
function command_raw() {
    local name url updateTaskList
    # 定义临时文件
    local tmp_file="${ARCADIA_DIR}/.raw.yml"

    ## 处理命令选项
    function handle_options() {
        case $# in
        0)
            print_command_help raw
            exit
            ;;
        1)
            case "$1" in
            -h | --help)
                print_command_help raw
                exit
                ;;
            *)
                output_error "缺少必须提供的 url 参数！"
                ;;
            esac
            ;;
        *)
            name="$1"
            shift
            url="$1"
            shift

            ## 判断命令选项
            while [ $# -gt 0 ]; do
                case "$1" in
                --updateTaskList)
                    if [ "$2" ]; then
                        echo "$2" | grep -Eqw "true|false"
                        if [ $? -eq 0 ]; then
                            updateTaskList="$2"
                            shift
                        else
                            output_error "检测到无效命令选项值 ${BLUE}$2${PLAIN} ，请输入布尔值！"
                        fi
                    else
                        output_error "检测到 ${BLUE}$1${PLAIN} 为无效命令选项，请在该命令选项后指定布尔值！"
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
    }

    # 生成配置文件模板
    function create_template() {
        echo '{ "name": "", "url": "", "cronSettings": { "updateTaskList": false } }' | jq | yq -y >$tmp_file
        # 插入缩进空格
        local LineSum="$(cat $tmp_file | grep "" -c)"
        for ((i = 1; i <= $LineSum; i++)); do
            [ $i -eq 1 ] && sed -i "1s/^/  - /g" $tmp_file || sed -i "${i}s/^/    /g" $tmp_file
        done
    }

    # 替换用户配置
    function replace_user_conf() {
        sed -i "s|name: \'\'|name: \"${name}\"|g" $tmp_file
        sed -i "s|url: \'\'|url: \"${url}\"|g" $tmp_file
        [ "${updateTaskList}" ] && sed -i "s|updateTaskList: false|updateTaskList: ${updateTaskList}|g" $tmp_file
        echo -e "\n$TIP 自动生成的配置内容如下：\n"
        cat $tmp_file | sed "s/^  //g"
        echo ''
    }

    # 保存配置（写入至配置文件）
    function save_conf() {
        local LinesInfo="$(cat $FileSyncConfUser | grep -n "" | grep -Ev "^[0-9]{1,4}:  ")"
        # 判断是否有设置 raw 键值对
        echo "${LinesInfo}" | grep -Eq ":raw:$"
        if [ $? -eq 0 ]; then
            # 判断是否在最后
            if [[ "$(echo "${LinesInfo}" | grep -E ":raw:$" -A 1 | tail -n 1 | awk -F ':' '{print$2}')" == "raw" ]]; then
                echo -e "\n$(cat $tmp_file)\n" >>$FileSyncConfUser
            else
                local writeLineNum=$(echo "${LinesInfo}" | grep -E ":raw:$" -A 1 | tail -n 1 | awk -F ':' '{print$1}')
                writeLineNum=$(($writeLineNum - 1))
                sed -i "$writeLineNum r $tmp_file" $FileSyncConfUser
            fi
        else
            echo -e "raw:\n$(cat $tmp_file)\n" >>$FileSyncConfUser
        fi
        if [ $? -eq 0 ]; then
            echo -e "$SUCCESS 已写入至 ${BLUE}${FileSyncConfUser##*/}${PLAIN} 配置文件，你可以在之后执行更新命令 ${BLUE}${ArcadiaCmd} update raw${PLAIN} 来使该配置生效\n"
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
    # 替换用户配置
    replace_user_conf
    # 保存配置
    save_conf
    # 删除临时文件
    [ -f $tmp_file ] && rm -rf $tmp_file
}
