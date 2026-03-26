# ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 自 定 义 环 境 变 量 设 置 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #
# 可在下方编写你需要用到的环境变量，格式：export 变量名="变量值"





# ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 推 送 通 知 设 置 区 域 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ #

# 在下方定义推送通知方式，想通过什么渠道收取通知，就填入对应渠道的值，你也可以同时使用多个渠道获取通知
# 目前提供：Server酱、Bark、Telegram、钉钉、企业微信、iGot、pushplus、go-cqhttp、WxPusher
# 项目文档：https://arcadia.cool/docs/configuration/notify

## ❖ 定义通知尾
export NOTIFY_TAIL="❖ 本通知 By：https://github.com/SuperManito/Arcadia"

## ❖ 通知内容屏蔽关键词，多个词用 "&" 连接，注意屏蔽针对的是内容而不是通知标题
export NOTIFY_MASKING=""

## ❖ 1. Server酱
# 官网：https://sct.ftqq.com
# 下方填写 SCHKEY 值或 SendKey 值
export PUSH_KEY=""
# 自建Server酱
export SCKEY_WECOM=""
export SCKEY_WECOM_URL=""


## ❖ 2. Bark
# 下方填写app提供的设备码，例如：https://api.day.app/123 那么此处的设备码就是123
export BARK_PUSH=""
# 下方填写推送声音设置，例如choo，具体值请在bark-推送铃声-查看所有铃声
export BARK_SOUND=""
# 下方填写推送消息分组，默认为 "Arcadia"，推送成功后可以在bark-历史消息-右上角文件夹图标查看
export BARK_GROUP=""


## ❖ 3. Telegram
# 需设备可连接外网，"TG_BOT_TOKEN" 和 "TG_USER_ID" 必须同时赋值
# 下方填写自己申请 @BotFather 的 Token，如 10xxx4:AAFcqxxxxgER5uw
export TG_BOT_TOKEN=""
# 下方填写 @getuseridbot 中获取到的纯数字ID
export TG_USER_ID=""
# Telegram 代理IP（选填）
# 下方填写代理IP地址，代理类型为 http，比如你代理是 http://127.0.0.1:1080，则填写 "127.0.0.1"
# 如需使用，请自行解除下一行的注释并赋值
# export TG_PROXY_HOST=""
# Telegram 代理端口（选填）
# 下方填写代理端口号，代理类型为 http，比如你代理是 http://127.0.0.1:1080，则填写 "1080"
# 如需使用，请自行解除下一行的注释并赋值
# export TG_PROXY_PORT=""
# Telegram 代理的认证参数（选填）
# export TG_PROXY_AUTH=""
# Telegram api自建反向代理地址（选填）
# 教程：https://www.hostloc.com/thread-805441-1-1.html
# 如反向代理地址 http://aaa.bbb.ccc 则填写 aaa.bbb.ccc
# 如需使用，请赋值代理地址链接，并自行解除下一行的注释
# export TG_API_HOST=""


## ❖ 4. 钉钉
# 官方文档：https://developers.dingtalk.com/document/app/custom-robot-access
# "DD_BOT_TOKEN" 和 "DD_BOT_SECRET" 必须同时赋值
# 下方填写token后面的内容，只需 https://oapi.dingtalk.com/robot/send?access_token=XXX 等于=符号后面的XXX即可
export DD_BOT_TOKEN=""
# 下方填写密钥，机器人安全设置页面，加签一栏下面显示的 SEC 开头的 SECXXXXXXXXXX 等字符
# 注:钉钉机器人安全设置只需勾选加签即可，其他选项不要勾选
export DD_BOT_SECRET=""


## ❖ 5. 企业微信 - 机器人
# 官方文档：https://work.weixin.qq.com/api/doc/90000/90136/91770
# 下方填写密钥，企业微信推送 webhook 后面的 key
export QYWX_KEY=""


## ❖ 6. 企业微信 - 应用
# 参考文档：http://note.youdao.com/s/HMiudGkb
#          http://note.youdao.com/noteshare?id=1a0c8aff284ad28cbd011b29b3ad0191
# 下方填写素材库图片id（corpid,corpsecret,touser,agentid），素材库图片填0为图文消息, 填1为纯文本消息
export QYWX_AM=""


## ❖ 7. iGot聚合
# 官方文档：https://wahao.github.io/Bark-MP-helper
# 下方填写iGot的推送key，支持多方式推送，确保消息可达
export IGOT_PUSH_KEY=""


## ❖ 8. pushplus
# 官网：http://www.pushplus.plus
# 下方填写你的Token，微信扫码登录后一对一推送或一对多推送下面的 token，只填 "PUSH_PLUS_TOKEN" 默认为一对一推送
export PUSH_PLUS_TOKEN=""
# 一对一多推送（选填）
# 下方填写你的一对多推送的 "群组编码" ，（一对多推送下面->你的群组(如无则新建)->群组编码）
# 注 1. 需订阅者扫描二维码
#    2、如果你是创建群组所属人，也需点击“查看二维码”扫描绑定，否则不能接受群组消息推送
export PUSH_PLUS_USER=""


## ❖ 9. WxPusher
# 官方仓库：https://github.com/wxpusher/wxpusher-client
# 官方文档：https://wxpusher.zjiecode.com/docs
# 微信公众号：WxPusher 消息推送平台
# 下方填写你申请的 appToken，可在管理台查看：https://wxpusher.zjiecode.com/admin/main/app/appToken
export WP_APP_TOKEN=""
# 下方填写发送目标用户的UID，多个用户用 ";" 分隔，WP_UIDS 和 WP_TOPICIDS 可以同时填写, 也可以只填写一个
export WP_UIDS=""
# 下方填写发送主题的 TopicId ，适用于群发，用户只需要订阅主题即可，多个主题用 ";" 分隔，使用 WP_UIDS 单独发送的时可以不定义此变量
export WP_TOPICIDS=""
# 下方填写原文链接，如需使用请赋值并自行解除下一行的注释
# export WP_URL=""
