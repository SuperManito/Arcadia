#!/bin/bash
## Modified: 2024-04-27

function arcadia_init() {
  # ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 第 二 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
  echo -e "\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➁ 启动核心服务开始 -----\n"
  cd $SrcDir
  [ ! -x /usr/bin/npm ] && apt-get install -y --no-install-recommends nodejs npm >/dev/null 2>&1
  npm install --omit=dev
  pm2 start ecosystem.config.js
  cd $RootDir
  [ ! -x /usr/bin/ttyd ] && wget https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.$(arch) -q -O /usr/local/bin/ttyd && chmod 777 /usr/local/bin/ttyd
  pm2 start ttyd --name "arcadia_ttyd" --log-date-format "YYYY-MM-DD HH:mm:ss" -- \
    -p 7685 \
    -i lo \
    --writable \
    -t fontFamily='SF-Mono, SF Mono, Monaspace Neno, JetBrains Mono, Consolas, Courier New, monospace' \
    -t fontSize=14 \
    -t lineHeight=1.5 \
    -t disableLeaveAlert=true \
    -t disableResizeOverlay=true \
    -t macOptionIsMeta=true \
    -t macOptionClickForcesSelection=true \
    bash
  if [[ -z $(grep -E "123456789" ${ConfigDir}/bot.json) ]]; then
    $ArcadiaCmd tgbot start
  fi
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➁ 启动核心服务结束 -----\n"

  # ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 第 三 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
  if [[ -f $FileConfUser ]] && [[ -f $FileInitExtra ]]; then
    cat $FileConfUser | grep -Eq "^EnableInitExtra=[\"\']true[\"\']"
    if [ $? -eq 0 ]; then
      echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➂ 自定义初始化脚本开始 -----\n"
      source $FileInitExtra
      echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} ----- ➂ 自定义初始化脚本结束 -----\n"
    fi
  fi

  # 启动成功
  echo -e "\n\033[1;34m$(date "+%Y-%m-%d %T")${PLAIN} \033[1;32mArcadia is Working...${PLAIN}\n"
}
