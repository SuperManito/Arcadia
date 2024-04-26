#!/bin/bash
## Modified: 2024-04-23

## 清空定时任务关联代码文件清单内容
function clean_list_scripts() {
    local Dirs=("$ListOldScripts $ListNewScripts $ListAddScripts $ListDelScripts $ListConfScripts")
    for file in ${Dirs}; do
        [ -f $file ] && sed -i '1,$d' $file || touch $file
    done
    echo "{}" >$ListConfScripts
}

## 更新 Repo 代码仓库和 RawFile 远程代码文件
function update_sync() {
    import core/sync
    ## 创建目录
    make_dir $RepoDir $RawDir $LogTmpDir
    ## 清空定时任务关联代码文件清单内容
    clean_list_scripts
    ## 根据模式进行选择
    case $1 in
    all)
        import update/repo
        update_all_repo
        import update/raw
        update_raw
        ;;
    repo)
        import update/repo
        update_all_repo
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
    all)
        update_mod="全部内容"
        ;;
    repo)
        update_mod="所有仓库"
        ;;
    raw)
        update_mod="远程文件"
        ;;
    extra)
        update_mod="额外脚本"
        ;;
    designated)
        update_mod="指定仓库"
        ;;
    esac
    echo -e "\n[\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN}] 执行更新程序开始 - ${update_mod}"
}

function print_title_end() {
    echo -e "\n[\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN}] 执行更新程序结束\n"
}

function command_update_main() {
    case $1 in
    all)
        print_title_start "all"
        update_sync "all"
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
        if [[ $EnableUpdateExtraSync == true ]] || [[ $EnableUpdateExtra == true ]]; then
            print_title_start $1
            import update/extra
            update_extra
        else
            echo -e "\n$ERROR 请先在 $FileConfUser 中启用关于自定义更新脚本的相关变量！\n"
        fi
        ;;
    *)
        ## 判断传入参数
        echo $1 | grep "\/" -q
        if [ $? -eq 0 ]; then
            import update/repo
            update_designated_repo $1
        else
            if [ ! -d "$(pwd)/$1" ]; then
                output_command_error 1 # 命令错误
            fi
            import update/repo
            if [[ "$1" = "." ]]; then
                update_designated_repo "$(pwd)"
            elif [[ "$1" = "./" ]]; then
                update_designated_repo "$(pwd)"
            else
                update_designated_repo "$(pwd)/$1"
            fi
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
