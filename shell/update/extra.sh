#!/bin/bash

## 自定义更新脚本
# update extra
function update_extra() {
    echo ''
    ## 同步
    if [[ "${CLI_CONFIG_ENABLE_UPDATE_EXTRA_SYNC_FILE}" == "true" ]] && [[ $CLI_CONFIG_UPDATE_EXTRA_SYNC_FILE_URL ]]; then
        echo -e "$WORKING 开始同步自定义更新脚本：$CLI_CONFIG_UPDATE_EXTRA_SYNC_FILE_URL\n"
        wget -q --no-check-certificate $CLI_CONFIG_UPDATE_EXTRA_SYNC_FILE_URL -O $FileUpdateExtra.new -T 20
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
    if [[ "${CLI_CONFIG_ENABLE_UPDATE_EXTRA}" == "true" ]]; then
        if [ -f $FileUpdateExtra ]; then
            echo -e "$WORKING 开始执行自定义更新脚本：$FileUpdateExtra\n"
            source $FileUpdateExtra
            echo -e "\n$COMPLETE 自定义更新脚本执行完毕\n"
        else
            echo -e "$ERROR 自定义更新脚本不存在，跳过执行...\n"
        fi
    fi
}
