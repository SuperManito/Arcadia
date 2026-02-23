#!/bin/bash

# type可选,不传默认为message
# sendToServer "message"
# sendToServer "message" "type"
sendToServer() {
  local message="$1"
  local type="$2"

  [ -z "$message" ] && return 0
  [ -z "$type" ] && type="message"

  if [ -z "${__MESSAGE_SEND_TO_SERVER_BASE_DIR:-}" ]; then
    echo "错误: 环境变量未设置,无法进行操作" >&2
    exit 1
  fi

  (
    flock -x 200 || {
      echo "错误: 无法获取文件锁" >&2
      exit 1
    }
    if [ ! -f "${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/index" ]; then
      echo "0" > "${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/index"
    fi

    local idx=0
    idx=$(<"${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/index") || {
      echo "错误: 无法读取索引文件" >&2
      exit 1
    }

    ((idx++))

    echo "$type=$message" > "${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/${idx}" || {
      echo "错误: 无法写入文件" >&2
      exit 1
    }

    echo "$idx" > "${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/index" || {
      rm -f "${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/${idx}" 2>/dev/null
      echo "错误: 无法更新索引" >&2
      exit 1
    }
  ) 200>"${__MESSAGE_SEND_TO_SERVER_BASE_DIR}/.lock"
}

if [ -n "${__MESSAGE_SEND_TO_SERVER_BASE_DIR:-}" ]; then
  mkdir -p "${__MESSAGE_SEND_TO_SERVER_BASE_DIR}" 2>/dev/null || {
      echo "错误: 无法创建目录 ${__MESSAGE_SEND_TO_SERVER_BASE_DIR}" >&2
      exit 1
  }
fi
