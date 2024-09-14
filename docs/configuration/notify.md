---
title: 推送通知
---

:::warning 过时的内容
未来将上线消息中心和监控告警功能，当前内容将被废弃已不再维护，注意持续关注项目的功能变动
:::

# 推送通知

用于在运行脚本后将指定内容推送到你的设备上，推送内容由脚本而定，可同时使用多个渠道的推送通知服务  
目前提供：Server酱、Bark、Telegram、钉钉、企业微信、iGot、pushplus、go-cqhttp、WxPusher

此功能基于底层 `sendNotify.js` 脚本实现

:::note 管理面板入口
编辑配置 - 下拉选择 `config.sh` - 推送通知设置区域
:::

- ### 通知尾

    ```bash
    export NOTIFY_TAIL="本通知 By：https://github.com/SuperManito/Arcadia"
    ```
    默认如上，如想修改请编辑 **config.sh** 配置文件中的变量

- ### 通知屏蔽

    ```bash
    export NOTIFY_MASKING=""
    ```
    变量中填写想要屏蔽的关键词，多个词用 `&` 连接，注意屏蔽针对的是内容而不是通知标题

***

## Server酱
官网：https://sct.ftqq.com

- SCHKEY 或 SendKey（必填）

  ```bash
  export PUSH_KEY=""
  ```

- 自建 Server 酱（选填）

  ```bash
  export SCKEY_WECOM=""
  export SCKEY_WECOM_URL=""
  ```

***

## Bark

- 设备码（必填）

  ```bash
  export BARK_PUSH=""
  ```
  例如 [https://api.day.app/123](https://api.day.app/123) 则填写 `123`

- 声音设置（必填）

  ```bash
  export BARK_SOUND=""
  ```
  具体值请在bark-推送铃声-查看所有铃声，例如 `choo`

- 推送消息分组

  ```bash
  export BARK_GROUP=""
  ```
  默认为 `Arcadia`，推送成功后可以在`历史消息 - 右上角文件夹图标`查看

***

## Telegram 

:::warning 注意
注意网络连通性问题，可能需要魔法
:::

- token（必填）

    ```bash
    export TG_BOT_TOKEN=""
    ```
    填写自己申请 [@BotFather](https://t.me/BotFather) 的 Token，如 `10xxx4:AAFcqxxxxgER5uw`

- user_id（必填）

    ```bash
    export TG_USER_ID=""
    ```
    填写 [@getuseridbot](https://t.me/getuseridbot) 中获取到的纯数字ID

- 代理设置

  在配置文件中，代理相关变量已默认被注释，如需使用请自行解除注释

  - 代理IP地址（选填）

      ```bash
      export TG_PROXY_HOST=""
      ```
      代理类型为 http，例如你的代理是 [http://127.0.0.1:1080](http://127.0.0.1:1080) 则填写 `127.0.0.1`

  - #代理端口（选填）

      ```bash
      export TG_PROXY_PORT=""
      ```
      代理类型为 http，例如你代理是 [http://127.0.0.1:1080](http://127.0.0.1:1080) 则填写 `1080`

  - 认证参数（选填）

      ```bash
      export TG_PROXY_AUTH=""
      ```

  - api自建反向代理地址（选填）

      参考教程：https://www.hostloc.com/thread-805441-1-1.html

      ```bash
      export TG_API_HOST=""
      ```
      例如你的如反向代理地址 [http://aaa.bbb.ccc](http://aaa.bbb.ccc) 则填写 `aaa.bbb.ccc`

***

## 钉钉 
官方文档：https://developers.dingtalk.com/document/app/custom-robot-access

- token后面的内容（必填）

  ```bash
  export DD_BOT_TOKEN=""
  ```
  只需 [https://oapi.dingtalk.com/robot/send?access_token=XXX](https://oapi.dingtalk.com/robot/send?access_token=XXX) 等号后面的 `XXX` 即可

- 密钥（必填）

  ```bash
  export DD_BOT_SECRET=""
  ```
  机器人安全设置页面，加签一栏下面显示的 **SEC** 开头的 **SECXXXXXXXXXX** 等字符

  :::warning 注意
  钉钉机器人安全设置只需勾选加签即可，其他选项不要勾选
  :::

***

## 企业微信机器人
官方文档：https://work.weixin.qq.com/api/doc/90000/90136/91770

- 密钥（必填）

  ```bash
  export QYWX_KEY=""
  ```
  企业微信推送 webhook 后面的 `key`

***

## 企业微信应用
参考文档：http://note.youdao.com/s/HMiudGkb  
ㅤㅤㅤㅤㅤhttp://note.youdao.com/noteshare?id=1a0c8aff284ad28cbd011b29b3ad0191

- id（必填）

  ```bash
  export QYWX_AM=""
  ```
  素材库图片id（corpid,corpsecret,touser,agentid），素材库图片填 **0** 为图文消息, 填 **1** 为纯文本消息

***

## iGot聚合
官方文档：https://wahao.github.io/Bark-MP-helper

- 推送key（必填）

  ```bash
  export IGOT_PUSH_KEY=""
  ```
  支持多方式推送，确保消息可达

***

## pushplus

官网：http://www.pushplus.plus

- Token（必填）

  ```bash
  export PUSH_PLUS_TOKEN=""
  ```
  微信扫码登录后一对一推送或一对多推送下面的 token，只填此变量默认为一对一推送

- 一对一多推送群组编码（选填）

  ```bash
  export PUSH_PLUS_USER=""
  ```
  一对多推送下面 -你的群组(如无则新建) -群组编码

  需订阅者扫描二维码；如果你是创建群组所属人，也需点击 **查看二维码** 扫描绑定

***

## WxPusher
官方仓库：https://github.com/wxpusher/wxpusher-client  
官方文档：https://wxpusher.zjiecode.com/docs  
微信公众号：WxPusher 消息推送平台

- appToken（必填）

  ```bash
  export WP_APP_TOKEN=""
  ```
  可在管理台查看：https://wxpusher.zjiecode.com/admin/main/app/appToken

- 微信用户的UID（选填）

  ```bash
  export WP_UIDS=""
  ```
  多个用户用 `;` 分隔，`WP_UIDS` 和 `WP_TOPICIDS` 可以同时填写, 也可以只填写一个

- 主题的TopicId（选填）

  ```bash
  export WP_TOPICIDS=""
  ```
  适用于群发，用户只需要订阅主题即可，多个主题用 `;` 分隔，使用 `WP_UIDS` 单独发送的时可以不定义此变量

- 原文链接（选填）

  ```bash
  export WP_URL=""
  ```

***

此页文档如有描述错误或其它问题请积极向开发者进行反馈，谢谢
