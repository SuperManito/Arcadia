#!/bin/bash
## Modified: 2024-04-18

function command_dev() {
    git remote -v | grep -q 'arcadia_github'
    if [ $? -eq 0 ]; then
        git remote set-url origin git@arcadia:SuperManito/ArcadiaBase.git
        echo -e "\n$COMPLETE 已切换回用户版本\n"
    else
        cat /root/.ssh/config | grep -q 'arcadia_github'
        [ $? -ne 0 ] && echo -e "Host arcadia_github\n    HostName github.com\n    IdentityFile /root/.ssh/arcadia\n" >>/root/.ssh/config
        git remote set-url origin git@arcadia_github:SuperManito/ArcadiaBase.git
        echo -e "\n$COMPLETE 已为您切换至开发版本，感谢参与测试\n"
    fi
}
