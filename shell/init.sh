#!/bin/bash
## EntryPoint 入口脚本

source $(dirname $(readlink -f "$0"))/core/main.sh

# 检测配置文件是否存在，不存在则复制一份
make_dir $ConfigDir
config_files="config.sh auth.json bot.json sync.yml"
for file in $config_files; do
    if [ ! -s "$ConfigDir/$file" ]; then
        cp -fv "$SampleDir/$file" "$ConfigDir/$file"
    fi
done

# ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 第 一 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➀ 同步最新源码开始 -----\n"
cd $SrcDir
sleep 2
git fetch --all
git reset --hard origin/$(git status | head -n 1 | awk -F ' ' '{print$NF}')
sleep 2

## 执行最新的初始化脚本
import init

set -e
arcadia_init
exec "$@"
