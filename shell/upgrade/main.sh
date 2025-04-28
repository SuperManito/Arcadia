#!/bin/bash
## Modified: 2024-04-28

## 更新项目
function command_upgrade() {
    import update/git
    ## 创建日志文件夹
    make_dir $LogDir
    ## 导入配置文件（不检查）
    import_config_not_check

    local project_depend_old project_depend_new
    ## 更新前先存储 package.json
    [ -f "${BackendDir}/package.json" ] && project_depend_old="$(cat "${BackendDir}/package.json")"
    ## 确认分支名称
    cd $SrcDir
    local src_branch_name="$(git status | head -n 1 | awk -F ' ' '{print$NF}')"
    cd $RootDir
    ## 更新仓库
    git_pull $SrcDir "${src_branch_name}" "Arcadia 源代码"
    if [[ $EXITSTATUS -eq 0 ]]; then
        echo -e "\n$COMPLETE 已更新\n"
    else
        echo -e "\n$FAIL 更新失败，请检查原因...\n"
    fi
    ## 检测依赖变动
    [ -f "${BackendDir}/package.json" ] && project_depend_new=$(cat "${BackendDir}/package.json")
    if [[ "${project_depend_old}" != "${project_depend_new}" ]]; then
        pm2 delete arcadia_server >/dev/null 2>&1
        pm2 delete arcadia_inner >/dev/null 2>&1
        pm2 delete arcadia_ttyd >/dev/null 2>&1
        $ArcadiaCmd service start
    fi
    ## 检测配置文件版本
    detect_config_version >/dev/null 2>&1
}

## 检测配置文件版本
function detect_config_version() {
    ## 识别出两个文件的版本号
    VerConfSample="$(grep " Version: " $FileConfSample | perl -pe "s|.+v((\d+\.?){3})|\1|")"
    [ -f $FileConfUser ] && VerConfUser="$(grep " Version: " $FileConfUser | perl -pe "s|.+v((\d+\.?){3})|\1|")"
    ## 删除旧的发送记录文件
    [ -f $FileSendMark ] && [[ "$(cat $FileSendMark)" != "${VerConfSample}" ]] && rm -f $FileSendMark
    ## 识别出更新日期和更新内容
    UpdateDate="$(grep " Date: " $FileConfSample | awk -F ": " '{print $2}')"
    UpdateContent="$(grep " Update Content: " $FileConfSample | awk -F ": " '{print $2}' | sed "s/[0-9]\./\\\n&/g")"
    ## 如果是今天，并且版本号不一致，则发送通知
    if [ -f $FileConfUser ] && [[ "${VerConfUser}" != "${VerConfSample}" ]] && [[ "${UpdateDate}" == "$(date "+%Y-%m-%d")" ]]; then
        if [ ! -f $FileSendMark ]; then
            local NotifyTitle="配置文件更新通知"
            local NotifyContent="更新日期: $UpdateDate\n当前版本: $VerConfUser\n新的版本: $VerConfSample\n更新内容: $UpdateContent"
            echo -e "\n$TIP 检测到配置文件更新"
            echo -e $NotifyContent
            send_notify "$NotifyTitle" "$NotifyContent"
            [ $? -eq 0 ] && echo $VerConfSample >$FileSendMark
        fi
    fi
}
