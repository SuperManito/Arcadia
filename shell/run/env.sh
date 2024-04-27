#!/bin/bash
## Modified: 2024-04-27

## 重组环境变量（复合）的值
function recombine_composite_env_values {
    local env_var_name="$1" # 复合环境变量名称
    local separator="$2"    # 分隔符
    local params="$3"       # 索引参数

    # 获取复合变量值的长度
    local length="$(echo "${!env_var_name}" | jq -Rr "split(\"${separator}\") | length")"
    # 解析参数
    local indexes=()
    local arg start end
    for arg in $(echo "${params}" | tr ',' ' '); do
        arg="$(echo $arg | sed "s/ //g; s/%/${length}/g")"
        if [[ $arg == *"-"* ]]; then
            start=$(echo $arg | awk -F '-' '{print $1}')
            end=$(echo $arg | awk -F '-' '{print $NF}')
            if ((start > length)); then
                output_error "重组表达式语法错误：序号 ${BLUE}${start}${PLAIN} 超出了索引！"
            elif ((end > length)); then
                output_error "重组表达式语法错误：序号 ${BLUE}${end}${PLAIN} 超出了索引！"
            fi
            if ((start < end)); then
                for ((i = $start; i <= $end; i++)); do
                    indexes+=($i)
                done
            else
                for ((i = $start; i >= $end; i--)); do
                    indexes+=($i)
                done
            fi
        else
            # 处理单个索引
            if ((arg > length)); then
                output_error "重组表达式语法错误：序号 ${BLUE}${arg}${PLAIN} 超出了索引！"
            fi
            indexes+=($arg)
        fi
    done

    # 打印重组后的原数据索引列表
    # echo ${indexes[@]}

    ## 重新声明环境变量
    # 基于 node.js 的实现
    local node_script="const input = process.env['${env_var_name}'].split('${separator}'); const result = '${indexes[@]}'.split(' ').map(i => input[i - 1]); console.log(result.join('${separator}'))"
    eval export "${env_var_name}"=\""$(node -e "${node_script}" 2>/dev/null)"\"

    # 基于 jq 的实现
    # local data=$(echo "${!env_var_name}" | jq -Rr "split(\"${separator}\")")
    # local jq_script=". as \$data | $(echo "[${indexes[@]}]" | tr ' ' ',' | jq "map(. - 1)") | map(\$data[.]) | join(\"${separator}\")"
    # eval export "${env_var_name}"=\""$(echo "$data" | jq -rc "$jq_script" 2>/dev/null)"\"
}

## 环境变量（复合）值去重
function deduplicate_composite_env_values {
    local env_var_name="$1" # 复合环境变量名称
    local separator="$2"    # 分隔符

    ## 重新声明环境变量
    # 基于 node.js 的实现
    eval export "${env_var_name}"=\""$(node -e "let items = process.env['${env_var_name}']; let uniqueItems = [...new Set(items.split('${separator}'))]; console.log(uniqueItems.join('${separator}'));" 2>/dev/null)"\"

    # 基于 jq 的实现
    # eval export "${env_var_name}"=\""$(echo "${!env_var_name}" | jq -Rr 'split("${separator}") | map(select(. != "")) | unique | join("${separator}")')"\"
}
