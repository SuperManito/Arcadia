#!/bin/bash
## Modified: 2023-05-27

## 自定义更新脚本
# update extra
function update_extra() {
    echo ''
    ## 同步
    if [[ "${EnableUpdateExtraSync}" == true ]] && [[ $UpdateExtraSyncUrl ]]; then
        echo -e "$WORKING 开始同步自定义更新脚本：$UpdateExtraSyncUrl\n"
        wget -q --no-check-certificate $UpdateExtraSyncUrl -O $FileUpdateExtra.new -T 20
        if [ $? -eq 0 ]; then
            mv -f "$FileUpdateExtra.new" "$FileUpdateExtra"
            echo -e "$COMPLETE 自定义更新脚本同步完成\n"
            sleep 1s
        else
            if [ -f $FileUpdateExtra ]; then
                echo -e "$FAIL 自定义更新脚本同步失败，保留之前的版本...\n"
            else
                echo -e "$FAIL 自定义更新脚本同步失败，请检查原因...\n"
            fi
            sleep 2s
        fi
        [ -f "$FileUpdateExtra.new" ] && rm -rf "$FileUpdateExtra.new"
    fi
    ## 执行
    if [[ "${EnableUpdateExtra}" == true ]]; then
        if [ -f $FileUpdateExtra ]; then
            echo -e "$WORKING 开始执行自定义更新脚本：$FileUpdateExtra\n"
            source $FileUpdateExtra
            echo -e "\n$COMPLETE 自定义更新脚本执行完毕\n"
        else
            echo -e "$ERROR 自定义更新脚本不存在，跳过执行...\n"
        fi
    fi
}
