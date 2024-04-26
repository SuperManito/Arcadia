#!/bin/bash
## Modified: 2024-04-27

function arcadia_init() {
  ## 检测软链接
  SOFT_LINK="arcadia"
  SOFT_LINK_OLD=""
  for soft in ${SOFT_LINK}; do
    if [ ! -L "/usr/local/bin/${soft}" ]; then
      ln -sf "${ARCADIA_DIR}/shell/${soft}.sh" "/usr/local/bin/${soft}"
      chmod 777 "/usr/local/bin/${soft}"
    fi
  done
  for soft_old in ${SOFT_LINK_OLD}; do
    if [ -L "/usr/local/bin/${soft_old}" ]; then
      rm -f "/usr/local/bin/${soft_old}"
    fi
  done

  ## 更新项目
  $ArcadiaCmd upgrade

  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➀ 同步最新源码结束 -----\n"

  # ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 第 二 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➁ 启动核心服务开始 -----\n"
  cd ${ARCADIA_DIR}
  [ ! -x /usr/bin/npm ] && apt-get install -y --no-install-recommends nodejs npm >/dev/null 2>&1
  [ ! -x /usr/bin/ttyd ] && apt-get install -y --no-install-recommends ttyd
  export PS1="\[\e[32;1m\]@ARCADIA\[\e[0m\] ➜ \[\e[34;1m\]\w\[\e[0m\] \\$ "
  pm2 start ttyd --name "arcadia_ttyd" --log-date-format "YYYY-MM-DD HH:mm:ss" -- \
    -p 7685 \
    -d 0 \
    -t fontFamily='SF Mono, JetBrains Mono, Courier New, Consolas, monospace' \
    -t fontSize=14 \
    -t lineHeight=1.5 \
    -t disableLeaveAlert=true \
    -t disableResizeOverlay=true \
    -t macOptionIsMeta=true \
    -t macOptionClickForcesSelection=true \
    bash
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} 网页终端启动成功 $SUCCESS\n"

  cd ./web
  echo -e "$WORKING 开始安装面板依赖模块...\n"
  npm install --omit=dev
  echo -e "\n$SUCCESS 模块安装完成\n"
  pm2 start ecosystem.config.js
  cd ${ARCADIA_DIR}
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} 后台管理面板启动成功 $SUCCESS\n"
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➁ 启动后台管理面板和网页终端结束 -----\n"

  # ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 第 三 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➂ 启动电报机器人开始 -----\n"
  if [[ -z $(grep -E "123456789" ${ARCADIA_DIR}/config/bot.json) ]]; then
    $ArcadiaCmd tgbot start
  else
    echo -e "检测到当前还没有配置 bot.json 可能是首次部署容器，因此不启动电报机器人..."
  fi
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➂ 启动电报机器人结束 -----\n"

  # ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 第 四 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
  if [[ -f $FileConfUser ]] && [[ -f $FileInitExtra ]]; then
    cat $FileConfUser | grep -Eq "^EnableInitExtra=[\"\']true[\"\']"
    if [ $? -eq 0 ]; then
      echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➃ 自定义初始化脚本开始 -----\n"
      source $FileInitExtra
      echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➃ 自定义初始化脚本结束 -----\n"
    fi
  fi

  # 启动成功
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} \033[1;32m容器启动成功${PLAIN}\n"

  crond -f >/dev/null 2>&1 # 保活
}
