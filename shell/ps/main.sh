#!/bin/bash
## Modified: 2024-11-22

## 进程状态功能
# ps
function command_ps() {
    # 统计内存占用
    local memory_total=$(free -m | grep Mem | awk -F ' ' '{print$2}')
    local memory_utilization_rate=$(free -m | grep Mem | awk -F ' ' '{print$3}')
    local memory_free=$(free -m | grep Mem | awk -F ' ' '{print$4}')
    local memory_available=$(free -m | grep Mem | awk -F ' ' '{print$7}')
    local memory_usage=$(awk 'BEGIN{printf "%.1f%%",('$memory_utilization_rate'/'$memory_total')*100}')
    # 统计配置文件占用
    local ConfigSpaceUsage=$(du -sm $ConfigDir | awk -F ' ' '{print$1}')
    # 统计日志占用
    local LogFilesSpaceUsage=$(du -sm $LogDir | awk -F ' ' '{print$1}')
    # 统计仓库和代码文件占用
    make_dir $ScriptsDir $RepoDir $RawDir
    local RepoDirSpaceUsage=$(du -sm $RepoDir | awk -F ' ' '{print$1}')
    local ScriptsDirSpaceUsage=$(du -sm $ScriptsDir | awk -F ' ' '{print$1}')
    local RawDirSpaceUsage=$(du -sm $RawDir | awk -F ' ' '{print$1}')

    ## 系统信息
    echo -e "
❖  内存使用率：${YELLOW}${memory_usage}${PLAIN}   可用内存：${YELLOW}${memory_available}MB${PLAIN}   空闲内存：${YELLOW}${memory_free}MB${PLAIN}

❖  配置文件占用：${YELLOW}${ConfigSpaceUsage}MB${PLAIN}  日志占用：${YELLOW}${LogFilesSpaceUsage}MB${PLAIN}  代码仓库占用：${YELLOW}${RepoDirSpaceUsage}MB${PLAIN}  远程文件占用：${YELLOW}$((${ScriptsDirSpaceUsage} + ${RawDirSpaceUsage}))MB${PLAIN}"

    ## 检测占用过高后释放内存（阈值：90%）
    if [[ $(echo ${memory_usage} | awk -F '.' '{print$1}') -gt "89" ]]; then
        sync >/dev/null 2>&1
        echo 3 >/proc/sys/vm/drop_caches >/dev/null 2>&1
        echo -e "\n$WORKING 检测到内存占用过高，开始尝试释放内存..."
        echo -e "${BLUE}[释放后]${PLAIN}  内存占用：${YELLOW}$(awk 'BEGIN{printf "%.1f%%\n",('$(free -m | grep Mem | awk -F ' ' '{print$3}')'/'$memory_total')*100}')${PLAIN}   可用内存：${YELLOW}$(free -m | grep Mem | awk -F ' ' '{print$4}')MB${PLAIN}"
    fi

    ## 列出进程
    echo -e "\n${BLUE}[运行时长]  [CPU]    [内存]    [脚本名称]${PLAIN}"
    ps -axo user,time,pcpu,user,pmem,user,command --sort -pmem | egrep "\.(js|mjs|cjs|py|ts|go|lua|rb|rs|pl|c)$" | egrep -v "${SrcDir}/server\.js|${SrcDir}/inner_server\.js|pm2 |egrep |perl |sed |bash |wget |\<defunct\>|node_modules/" | perl -pe '{s! root     !% !g; s!/usr/bin/(ts-node|ts-node-transpile-only|python3|python|node|go|deno|bun|lua|ruby|perl) !!g; s!/root/\.deno/bin/deno !!g; s!/root/\.bun/bin/bun !!g; s!/root/\.cargo/bin/\(rustc|cargo\) !!g; s!python3 -u !!g; s!(ts-node|ts-node-transpile-only|node) -r global-agent/bootstrap !(代理)!g; s!node !!g; s!root     !#!g; s!#[0-9][0-9]:!#!g; s!  ! !g; s! !     !g; s!#!•  !g; s!\./utils/!!g}'
    echo ''
}
