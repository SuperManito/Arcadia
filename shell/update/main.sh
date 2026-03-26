#!/bin/bash

## 清空定时任务关联代码文件清单内容
function clean_list_scripts() {
    local Dirs=("$ListOldScripts $ListNewScripts $ListAddScripts $ListDelScripts $ListConfScripts")
    for file in ${Dirs}; do
        [ -f $file ] && sed -i '1,$d' $file || touch $file
    done
    echo "{}" >$ListConfScripts
}

## 更新 Repo 代码仓库和 RawFile 代码文件
function update_sync() {
    ## 清空定时任务关联代码文件清单内容
    clean_list_scripts
    ## 根据模式进行选择
    case $1 in
    sync | all)
        import update/repo
        update_repo
        import update/raw
        update_raw
        ;;
    repo)
        import update/repo
        update_repo
        ;;
    raw)
        import update/raw
        update_raw
        ;;
    esac

    ## 更新定时任务
    import update/cron
    update_cron
}

function print_title_start() {
    local update_mod
    case "$1" in
    sync | all)
        update_mod=""
        ;;
    repo)
        update_mod="代码仓库"
        ;;
    raw)
        update_mod="代码文件"
        ;;
    designated_repo)
        update_mod="指定代码仓库"
        ;;
    designated)
        update_mod="指定配置"
        ;;
    extra)
        update_mod="运行额外更新脚本"
        ;;
    esac
    if [[ "${update_mod}" ]]; then
        echo -e "\n[\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN}] 更新代码同步开始 - ${update_mod}"
    else
        echo -e "\n[\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN}] 更新代码同步开始"
    fi
}

function print_title_end() {
    echo -e "\n[\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN}] 更新代码同步结束\n"
}

function command_update_main() {
    import core/sync
    ## 创建目录
    make_dir $RepoDir $RawDir $LogTmpDir
    case $1 in
    sync | all)
        print_title_start "sync"
        update_sync "sync"
        import update/extra
        update_extra
        ;;
    repo)
        print_title_start "repo"
        update_sync "repo"
        ;;
    raw)
        print_title_start "raw"
        update_sync "raw"
        ;;
    extra)
        if [[ "${CLI_CONFIG_ENABLE_UPDATE_EXTRA_SYNC_FILE}" == "true" ]] || [[ "${CLI_CONFIG_ENABLE_UPDATE_EXTRA}" == "true" ]]; then
            print_title_start $1
            import update/extra
            update_extra
        else
            echo -e "\n$ERROR 请先在 CLI 配置中启用关于自定义更新脚本的相关变量！\n"
        fi
        ;;
    *)
        ## 判断传入参数是否为有效路径，否则视为配置文件名称
        local path_content
        echo $1 | grep "\/" -q
        if [ $? -eq 0 ]; then
            path_content="$1"
        else
            if [[ "$1" = "." ]]; then
                path_content="$(pwd)"
            elif [[ "$1" = "./" ]]; then
                path_content="$(pwd)"
            elif [ -d "$(pwd)/$1" ]; then
                path_content="$(pwd)/$1"
            fi
        fi
        if [[ "${path_content}" ]]; then
            ## 转换为绝对路径
            local path="$(get_absolute_path "${path_content}")"
            import update/repo
            update_designated_repo "${path}"
        else
            ## 清空定时任务关联代码文件清单内容
            clean_list_scripts
            ## 更新特定名称的配置
            if [[ "$(is_config_name_exist "$1" "repo")" == true ]]; then
                print_title_start "designated"
                import update/repo
                update_repo "$1"
            elif [[ "$(is_config_name_exist "$1" "raw")" == true ]]; then
                print_title_start "designated"
                import update/raw
                update_raw "$1"
            else
                output_command_error 1 # 命令错误
            fi
            ## 更新定时任务
            import update/cron
            update_cron
        fi
        ;;
    esac
    print_title_end
}

function command_update() {
    case $# in
    0)
        print_command_help update
        ;;
    1)
        import update/git
        # 创建日志文件夹
        make_dir $LogDir
        # 导入配置文件（不检查）
        import_config_not_check
        command_update_main "$1" | tee -a $LogDir/update.log
        ;;
    *)
        output_command_error 2 # 命令过多
        ;;
    esac
}
