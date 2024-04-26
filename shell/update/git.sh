#!/bin/bash
## Modified: 2024-04-11

## 克隆仓库
function git_clone() {
    local url=$1    # 仓库地址
    local dir=$2    # 仓库保存路径
    local branch=$3 # 分支
    local text="${4:-"开始克隆仓库 ${BLUE}$url${PLAIN}"}"
    [[ $branch ]] && local command="-b $branch "
    echo -e "\n$WORKING ${text}\n"
    export GIT_TERMINAL_PROMPT=0
    git clone $command$url $dir
    EXITSTATUS=$?
}

## 克隆仓库（SSH 认证）
function git_clone_with_ssh_auth() {
    local alias=$1         # SSH 配置别名
    local hostname=$2      # SSH 主机名
    local identity_file=$3 # SSH 私钥文件路径
    local url=$4           # 仓库地址
    local dir=$5           # 仓库保存路径
    local branch=$6        # 分支
    local text=$7

    # 重定向仓库地址
    if [[ "${url}" != git@* ]]; then
        url="git@${alias}:"${url#http*://*/}
    fi

    handle_ssh_config "${alias}" "${hostname}" "${identity_file}"
    git_clone "${url}" "${dir}" "${branch}" "${text}"
}

## 克隆仓库（HTTP 认证）
function git_clone_with_http_auth() {
    local username=$1 # 用户名
    local password=$2 # 密码
    local url=$3      # 仓库地址
    local dir=$4      # 仓库保存路径
    local branch=$5   # 分支
    local text=$6

    # 重定向仓库地址
    if [[ "${url}" == http*://* ]] && [[ "${url}" != http*://*:*@* ]]; then
        local protocol=$(echo $url | awk -F/ '{print $1}')
        local baseurl=$(echo $url | awk -F/ '{print $3}')
        url="${protocol}//${username}:${password}@${url#"$protocol"//"$baseurl"}"
    fi

    git_clone "${url}" "${dir}" "${branch}" "${text}"
}

## 更新仓库
function git_pull() {
    local current_dir=$(pwd)
    local work_dir=$1 # 仓库根目录
    local branch=$2   # 分支
    local text="${3:-"开始更新仓库 ${BLUE}$work_dir${PLAIN}"}"
    cd $work_dir
    echo -e "\n$WORKING ${text}\n"
    export GIT_TERMINAL_PROMPT=0
    git fetch --all
    EXITSTATUS=$?
    git pull
    git reset --hard origin/$branch
    cd $current_dir
}

## 重置仓库远程链接
# $1：要重置的目录，$2：要重置为的网址
function reset_romote_url() {
    local current_dir=$(pwd)
    local work_dir=$1 # 仓库根目录
    local url=$2      # 新的仓库地址
    if [ -d "$work_dir/.git" ]; then
        cd $work_dir
        export GIT_TERMINAL_PROMPT=0
        git remote set-url origin $url >/dev/null 2>&1
        cd $current_dir
    fi
}

## 重置仓库远程链接（SSH 认证）
function reset_romote_url_with_ssh_auth() {
    local alias=$1         # SSH 配置别名
    local hostname=$2      # SSH 主机名
    local identity_file=$3 # SSH 私钥文件路径
    local work_dir=$4      # 仓库根目录
    local url=$5           # 新的仓库地址

    # 重定向仓库地址
    if [[ "${url}" != git@* ]]; then
        url="git@${alias}:"${url#http*://*/}
    fi

    handle_ssh_config "${alias}" "${hostname}" "${identity_file}"
    reset_romote_url "${work_dir}" "${url}"
}

## 重置仓库远程链接（HTTP 认证）
function reset_romote_url_with_http_auth() {
    local username=$1 # 用户名
    local password=$2 # 密码
    local work_dir=$3 # 仓库根目录
    local url=$4      # 新的仓库地址

    # 重定向仓库地址
    if [[ "${url}" == http*://* ]] && [[ "${url}" != http*://*:*@* ]]; then
        local protocol=$(echo $url | awk -F/ '{print $1}')
        local baseurl=$(echo $url | awk -F/ '{print $3}')
        url="${protocol}//${username}:${password}@${url#"$protocol"//"$baseurl"}"
    fi

    reset_romote_url "${work_dir}" "${url}"
}

## 处理 SSH 认证配置
function handle_ssh_config() {
    local alias=$1         # SSH 配置别名
    local hostname=$2      # SSH 主机名
    local identity_file=$3 # SSH 私钥文件路径

    ## 处理 SSH 认证配置
    # 生成配置文件
    [ ! -f $FileSSHConfigUser ] && touch $FileSSHConfigUser
    # 修改私钥文件权限
    chmod 600 $identity_file >/dev/null 2>&1
    # 更改配置
    grep -q "^Host ${alias}$" $FileSSHConfigUser
    if [ $? -eq 0 ]; then
        # 判断是否需要更新配置
        if [[ $(get_ssh_conf_value "${alias}" "HostName") != "${hostname}" ]] || [[ $(get_ssh_conf_value "${alias}" "IdentityFile") != "${identity_file}" ]]; then
            del_ssh_conf "${alias}"
            add_ssh_conf "${alias}" "${hostname}" "${identity_file}"
        fi
    else
        add_ssh_conf "${alias}" "${hostname}" "${identity_file}"
    fi
}

## 添加 SSH 配置
function add_ssh_conf() {
    local alias="$1"         # 配置别名（Host）
    local hostname="$2"      # 主机名
    local identity_file="$3" # 私钥文件路径
    [ ! -f $FileSSHConfigUser ] && touch $FileSSHConfigUser
    grep -q "^Host ${alias}$" $FileSSHConfigUser
    [ $? -eq 0 ] && return
    echo -e "Host ${alias}\n    HostName ${hostname}\n    IdentityFile ${identity_file}\n" >>$FileSSHConfigUser
}

## 删除 SSH 配置
function del_ssh_conf() {
    [ ! -f $FileSSHConfigUser ] && return
    local alias="$1" # 配置别名（Host）
    grep -q "Host ${alias}$" $FileSSHConfigUser
    [ $? -ne 0 ] && return
    sed -i "/Host ${alias}$/,/^\s*$/d" $FileSSHConfigUser
}

## 提取 SSH 配置值
function get_ssh_conf_value() {
    [ ! -f $FileSSHConfigUser ] && return
    local alias="$1"    # 配置别名（Host）
    local property="$2" # 字段名
    grep -q "^Host ${alias}$" $FileSSHConfigUser
    [ $? -ne 0 ] && return
    sed -n "/^Host ${alias}$/,/^Host / {
        /^Host / b end
        p
    }
    :end" $FileSSHConfigUser | grep -iE "(^|\s)${property}(\s|=)" | sed 's/^[ \t]*//' | cut -d'=' -f2-
}
