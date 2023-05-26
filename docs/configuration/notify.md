---
title: 推送通知
---

# 推送通知

用于在运行脚本后将指定内容推送到你的设备上，推送内容由脚本而定，可同时使用多个渠道的推送通知服务  
目前提供：Server酱、Bark、Telegram、钉钉、企业微信、iGot、pushplus、go-cqhttp、WxPusher

:::note 后台管理面板入口
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

:::caution 注意
如果设备没有外网环境则需要使用代理
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

  :::caution 注意
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

## go-cqhttp
官方仓库：https://github.com/Mrs4s/go-cqhttp  
官方文档：https://docs.go-cqhttp.org/api  
搭建手册：https://docs.go-cqhttp.org/guide/quick_start.html 

- 监听地址（必填）

  ```bash
  export GO_CQHTTP_URL=""
  ```
  需要自建服务，具体搭建教程请查看官方文档，默认监听地址：`127.0.0.1:5700`

- qq号或qq群（必填）

  ```bash
  export GO_CQHTTP_QQ=""
  ```

- send_private_msg 或 send_group_msg（必填）

  ```bash
  export GO_CQHTTP_METHOD=""
  ```

- 需要分开推送的脚本名（选填）

  ```bash
  export GO_CQHTTP_SCRIPTS=""
  ```

- 外网扫码地址（选填）

  ```bash
  export GO_CQHTTP_LINK=""
  ```

- 消息分页字数（选填）

  ```bash
  export GO_CQHTTP_MSG_SIZE=""
  ```
  默认每 `1500` 字分为一条信息

- 当账号失效后是否启用私信（选填）

  ```bash
  export GO_CQHTTP_EXPIRE_SEND_PRIVATE=""
  ```
  默认启用，如需关闭请赋值为 `false`，由于在账号失效后一般会批量群发，有可能触发风控下线或者封号，不建议禁用

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
