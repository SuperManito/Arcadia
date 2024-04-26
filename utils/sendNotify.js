/**
 * sendNotify 推送通知功能
 * @param text 通知头
 * @param desp 通知体
 * @param params 某些推送通知方式点击弹窗可跳转, 例：{ url: 'https://abc.com' }
 * @param author 作者仓库等信息
 */

const $ = new Env()
const querystring = require('querystring')
const timeout = 15000 //超时时间(单位毫秒)

let end_txt = '本通知 By：https://github.com/SuperManito/Arcadia'
if (process.env.NOTIFY_TAIL) {
    end_txt = process.env.NOTIFY_TAIL
}

// =======================================微信server酱通知设置区域===========================================
//此处填你申请的SCKEY.
//(环境变量名 PUSH_KEY)
let SCKEY = ''

// =======================================Bark App通知设置区域===========================================
//此处填你BarkAPP的信息(IP/设备码，例如：https://api.day.app/XXXXXXXX)
let BARK_PUSH = ''
//BARK app推送铃声,铃声列表去APP查看复制填写
let BARK_SOUND = ''
//BARK app推送消息的分组, 默认为"Arcadia"
let BARK_GROUP = 'Arcadia'
//BARK app推送icon, 可以自定义图片文件路径
let BARK_ICON = ''

// =======================================telegram机器人通知设置区域===========================================
//此处填你telegram bot 的Token，telegram机器人通知推送必填项.例如：1077xxx4424:AAFjv0FcqxxxxxxgEMGfi22B4yh15R5uw
//(环境变量名 TG_BOT_TOKEN)
let TG_BOT_TOKEN = ''
//此处填你接收通知消息的telegram用户的id，telegram机器人通知推送必填项.例如：129xxx206
//(环境变量名 TG_USER_ID)
let TG_USER_ID = ''
//tg推送HTTP代理设置(不懂可忽略,telegram机器人通知推送功能中非必填)
let TG_PROXY_HOST = '' //例如:127.0.0.1(环境变量名:TG_PROXY_HOST)
let TG_PROXY_PORT = '' //例如:1080(环境变量名:TG_PROXY_PORT)
let TG_PROXY_AUTH = '' //tg代理配置认证参数
//Telegram api自建的反向代理地址(不懂可忽略,telegram机器人通知推送功能中非必填),默认tg官方api(环境变量名:TG_API_HOST)
let TG_API_HOST = 'api.telegram.org'

// =======================================钉钉机器人通知设置区域===========================================
//此处填你钉钉 bot 的webhook，例如：5a544165465465645d0f31dca676e7bd07415asdasd
//(环境变量名 DD_BOT_TOKEN)
let DD_BOT_TOKEN = ''
//密钥，机器人安全设置页面，加签一栏下面显示的SEC开头的字符串
let DD_BOT_SECRET = ''

// =======================================企业微信机器人通知设置区域===========================================
//此处填你企业微信机器人的 webhook(详见文档 https://work.weixin.qq.com/api/doc/90000/90136/91770)，例如：693a91f6-7xxx-4bc4-97a0-0ec2sifa5aaa
//(环境变量名 QYWX_KEY)
let QYWX_KEY = ''

// =======================================企业微信应用消息通知设置区域===========================================
/*
此处填你企业微信应用消息的值(详见文档 https://work.weixin.qq.com/api/doc/90000/90135/90236)
环境变量名 QYWX_AM依次填入 corpid,corpsecret,touser(注:多个成员ID使用|隔开),agentid,消息类型(选填,不填默认文本消息类型)
注意用,号隔开(英文输入法的逗号)，例如：wwcff56746d9adwers,B-791548lnzXBE6_BWfxdf3kSTMJr9vFEPKAbh6WERQ,mingcheng,1000001,2COXgjH2UIfERF2zxrtUOKgQ9XklUqMdGSWLBoW_lSDAdafat
可选推送消息类型(推荐使用图文消息（mpnews）):
- 文本卡片消息: 0 (数字零)
- 文本消息: 1 (数字一)
- 图文消息（mpnews）: 素材库图片id, 可查看此教程(http://note.youdao.com/s/HMiudGkb)或者(https://note.youdao.com/ynoteshare1/index.html?id=1a0c8aff284ad28cbd011b29b3ad0191&type=note)
*/
let QYWX_AM = ''

// =======================================iGot聚合推送通知设置区域===========================================
//此处填您iGot的信息(推送key，例如：https://push.hellyw.com/XXXXXXXX)
let IGOT_PUSH_KEY = ''

// =======================================pushplus设置区域=======================================
//官方文档：http://www.pushplus.plus/
//PUSH_PLUS_TOKEN：微信扫码登录后一对一推送或一对多推送下面的token(您的Token)，不提供PUSH_PLUS_USER则默认为一对一推送
//PUSH_PLUS_USER： 一对多推送的“群组编码”（一对多推送下面->您的群组(如无则新建)->群组编码，如果您是创建群组人。也需点击“查看二维码”扫描绑定，否则不能接受群组消息推送）
let PUSH_PLUS_TOKEN = ''
let PUSH_PLUS_USER = ''

// ======================================= WxPusher 通知设置区域 ===========================================
// 此处填你申请的 appToken. 官方文档：https://wxpusher.zjiecode.com/docs
// WP_APP_TOKEN 可在管理台查看: https://wxpusher.zjiecode.com/admin/main/app/appToken
// WP_TOPICIDS 群发, 发送目标的 topicId, 以 ; 分隔! 使用 WP_UIDS 单发的时候, 可以不传
// WP_UIDS 发送目标的 uid, 以 ; 分隔。注意 WP_UIDS 和 WP_TOPICIDS 可以同时填写, 也可以只填写一个。
// WP_URL 原文链接, 可选参数
let WP_APP_TOKEN = ''
let WP_TOPICIDS = ''
let WP_UIDS = ''
let WP_URL = ''

//==========================云端环境变量的判断与接收=========================

if (process.env.PUSH_KEY) {
    SCKEY = process.env.PUSH_KEY
}
if (process.env.BARK_PUSH) {
    if (process.env.BARK_PUSH.indexOf('https') > -1 || process.env.BARK_PUSH.indexOf('http') > -1) {
        //兼容BARK自建用户
        BARK_PUSH = process.env.BARK_PUSH
    } else {
        BARK_PUSH = `https://api.day.app/${process.env.BARK_PUSH}`
    }
    if (process.env.BARK_SOUND) {
        BARK_SOUND = process.env.BARK_SOUND
    }
    if (process.env.BARK_GROUP) {
        BARK_GROUP = process.env.BARK_GROUP
    }
    if (process.env.BARK_ICON) {
        BARK_ICON = process.env.BARK_ICON
    }
} else {
    if (BARK_PUSH && BARK_PUSH.indexOf('https') === -1 && BARK_PUSH.indexOf('http') === -1) {
        //兼容BARK本地用户只填写设备码的情况
        BARK_PUSH = `https://api.day.app/${BARK_PUSH}`
    }
}
if (process.env.TG_BOT_TOKEN) {
    TG_BOT_TOKEN = process.env.TG_BOT_TOKEN
}
if (process.env.TG_USER_ID) {
    TG_USER_ID = process.env.TG_USER_ID
}
if (process.env.TG_PROXY_AUTH) TG_PROXY_AUTH = process.env.TG_PROXY_AUTH
if (process.env.TG_PROXY_HOST) TG_PROXY_HOST = process.env.TG_PROXY_HOST
if (process.env.TG_PROXY_PORT) TG_PROXY_PORT = process.env.TG_PROXY_PORT
if (process.env.TG_API_HOST) TG_API_HOST = process.env.TG_API_HOST
if (process.env.DD_BOT_TOKEN) {
    DD_BOT_TOKEN = process.env.DD_BOT_TOKEN
    if (process.env.DD_BOT_SECRET) {
        DD_BOT_SECRET = process.env.DD_BOT_SECRET
    }
}
if (process.env.QYWX_KEY) {
    QYWX_KEY = process.env.QYWX_KEY
}
if (process.env.QYWX_AM) {
    QYWX_AM = process.env.QYWX_AM
}
if (process.env.IGOT_PUSH_KEY) {
    IGOT_PUSH_KEY = process.env.IGOT_PUSH_KEY
}
if (process.env.PUSH_PLUS_TOKEN) {
    PUSH_PLUS_TOKEN = process.env.PUSH_PLUS_TOKEN
}
if (process.env.PUSH_PLUS_USER) {
    PUSH_PLUS_USER = process.env.PUSH_PLUS_USER
}
if (process.env.IGOT_PUSH_KEY) {
    IGOT_PUSH_KEY = process.env.IGOT_PUSH_KEY
}
if (process.env.PUSH_PLUS_TOKEN) {
    PUSH_PLUS_TOKEN = process.env.PUSH_PLUS_TOKEN
}
if (process.env.PUSH_PLUS_USER) {
    PUSH_PLUS_USER = process.env.PUSH_PLUS_USER
}
if (process.env.WP_APP_TOKEN) {
    WP_APP_TOKEN = process.env.WP_APP_TOKEN
}
if (process.env.WP_TOPICIDS) {
    WP_TOPICIDS = process.env.WP_TOPICIDS
}
if (process.env.WP_UIDS) {
    WP_UIDS = process.env.WP_UIDS
}
if (process.env.WP_URL) {
    WP_URL = process.env.WP_URL
}
if (process.env.GO_CQHTTP_URL) {
    GO_CQHTTP_URL = process.env.GO_CQHTTP_URL
}
if (process.env.GO_CQHTTP_QQ) {
    GO_CQHTTP_QQ = process.env.GO_CQHTTP_QQ
}
if (process.env.GO_CQHTTP_METHOD) {
    GO_CQHTTP_METHOD = process.env.GO_CQHTTP_METHOD
}
if (process.env.GO_CQHTTP_SCRIPTS) {
    GO_CQHTTP_SCRIPTS = process.env.GO_CQHTTP_SCRIPTS
}
if (process.env.GO_CQHTTP_LINK) {
    GO_CQHTTP_LINK = process.env.GO_CQHTTP_LINK
}
if (process.env.GO_CQHTTP_MSG_SIZE) {
    GO_CQHTTP_MSG_SIZE = process.env.GO_CQHTTP_MSG_SIZE
}
if (process.env.GO_CQHTTP_EXPIRE_SEND_PRIVATE) {
    GO_CQHTTP_EXPIRE_SEND_PRIVATE = process.env.GO_CQHTTP_EXPIRE_SEND_PRIVATE === 'true'
}

let tg_only = false
if (process.env.TG_ONLY) {
    tg_only = process.env.TG_ONLY
}

let notify_skip_text = ''
// 屏蔽推送的关键词，多个使用&连接
if (process.env.NOTIFY_MASKING) {
    notify_skip_text = process.env.NOTIFY_MASKING
}

async function sendNotify(text, desp, params = {}, author = '\n\n' + end_txt) {
    // 提供6种通知
    desp += author

    if (notify_skip_text && desp) {
        const Notify_SkipText = notify_skip_text.split('&')
        if (Notify_SkipText.length > 0) {
            for (var Templ in Notify_SkipText) {
                if (desp.indexOf(Notify_SkipText[Templ]) != -1) {
                    console.log('检测内容到内容存在屏蔽推送的关键字(' + Notify_SkipText[Templ] + ')，将跳过推送...')
                    return
                }
            }
        }
    }

    if (tg_only) {
        text = text.match(/.*?(?=\s?-)/g) ? text.match(/.*?(?=\s?-)/g)[0] : text
        await Promise.all([
            tgBotNotify(text, desp), //telegram 机器人
        ])
    } else {
        await Promise.all([
            serverNotify(text, desp), //微信server酱
            pushPlusNotify(text, desp), //pushplus(推送加)
        ])
        text = text.match(/.*?(?=\s?-)/g) ? text.match(/.*?(?=\s?-)/g)[0] : text
        await Promise.all([
            BarkNotify(text, desp, params), //iOS Bark APP
            tgBotNotify(text, desp), //telegram 机器人
            ddBotNotify(text, desp), //钉钉机器人
            qywxBotNotify(text, desp), //企业微信机器人
            qywxamNotify(text, desp), //企业微信应用消息推送
            iGotNotify(text, desp, params), //iGot
            wxPusherNotify(text, desp), //wxPusher
        ])
    }
}

function serverNotify(text, desp, time = 2100) {
    return new Promise((resolve) => {
        if (SCKEY) {
            //微信server酱推送通知一个\n不会换行，需要两个\n才能换行，故做此替换
            desp = desp.replace(/[\n\r]/g, '\n\n')
            const options = {
                url: SCKEY.includes('SCT') ? `https://sctapi.ftqq.com/${SCKEY}.send` : `https://sc.ftqq.com/${SCKEY}.send`,
                body: `text=${text}&desp=${desp}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout,
            }
            setTimeout(() => {
                $.post(options, (err, resp, data) => {
                    try {
                        if (err) {
                            console.log('\n发送通知调用API失败！\n')
                            console.log(err)
                        } else {
                            data = JSON.parse(data)
                            //server酱和Server酱·Turbo版的返回json格式不太一样
                            if (data.errno === 0 || data.data.errno === 0) {
                                console.log('Server酱发送通知消息成功🎉')
                            } else if (data.errno === 1024) {
                                // 一分钟内发送相同的内容会触发
                                console.log(`\nServer酱发送通知消息异常: ${data.errmsg}\n`)
                            } else {
                                console.log(`\nServer酱发送通知消息异常\n${JSON.stringify(data)}`)
                            }
                        }
                    } catch (e) {
                        $.logErr(e, resp)
                    } finally {
                        resolve(data)
                    }
                })
            }, time)
        } else {
            console.log('您未提供自建Server酱所需的 SCKEY ，取消自建Server酱推送消息通知🚫')
            resolve()
        }
    })
}

function textPage(text = '', pageSize = 1500) {
    let textArr = []
    for (let i = 0; i < Math.ceil(text.length / pageSize); i++) {
        textArr.push(text.substr(i * pageSize, pageSize))
    }
    return textArr
}

function BarkNotify(text, desp, params = {}) {
    return new Promise((resolve) => {
        if (BARK_PUSH) {
            const options = {
                url: `${BARK_PUSH}/${encodeURIComponent(text)}/${encodeURIComponent(desp)}?sound=${BARK_SOUND}&group=${BARK_GROUP}&icon=${BARK_ICON}&${querystring.stringify(params)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout,
            }
            $.get(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\nBark APP发送通知调用API失败！\n')
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.code === 200) {
                            console.log('Bark APP发送通知消息成功🎉')
                        } else {
                            console.log(`${data.message}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve()
                }
            })
        } else {
            console.log('您未提供Bark APP所需的 BARK_PUSH ，取消Bark推送消息通知🚫')
            resolve()
        }
    })
}

function tgBotNotify(text, desp) {
    return new Promise((resolve) => {
        if (TG_BOT_TOKEN && TG_USER_ID) {
            const options = {
                url: `https://${TG_API_HOST}/bot${TG_BOT_TOKEN}/sendMessage`,
                body: `chat_id=${TG_USER_ID}&text=${text}\n\n${desp}&disable_web_page_preview=true`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout,
            }
            if (TG_PROXY_HOST && TG_PROXY_PORT) {
                const tunnel = require('tunnel')
                const agent = {
                    https: tunnel.httpsOverHttp({
                        proxy: {
                            host: TG_PROXY_HOST,
                            port: TG_PROXY_PORT * 1,
                            proxyAuth: TG_PROXY_AUTH,
                        },
                    }),
                }
                Object.assign(options, { agent })
            }
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\nTelegram发送通知消息失败！\n')
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.ok) {
                            console.log('Telegram发送通知消息成功🎉')
                        } else if (data.error_code === 400) {
                            console.log('\n请主动给bot发送一条消息并检查接收用户ID是否正确！\n')
                        } else if (data.error_code === 401) {
                            console.log('\nTelegram bot 的 token 有误！\n')
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else {
            console.log('您未提供Telegram机器人推送所需的 TG_BOT_TOKEN 和 TG_USER_ID ，取消Telegram推送消息通知🚫')
            resolve()
        }
    })
}

function ddBotNotify(text, desp) {
    return new Promise((resolve) => {
        const options = {
            url: `https://oapi.dingtalk.com/robot/send?access_token=${DD_BOT_TOKEN}`,
            json: {
                msgtype: 'text',
                text: {
                    content: ` ${text}\n\n${desp}`,
                },
            },
            headers: {
                'Content-Type': 'application/json',
            },
            timeout,
        }
        if (DD_BOT_TOKEN && DD_BOT_SECRET) {
            const CryptoJS = require('crypto-js')
            const dateNow = Date.now()
            const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${dateNow}\n${DD_BOT_SECRET}`, DD_BOT_SECRET))
            options.url = `${options.url}&timestamp=${dateNow}&sign=${encodeURIComponent(sign)}`
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\n钉钉发送通知消息失败！\n')
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.errcode === 0) {
                            console.log('钉钉发送通知消息成功🎉')
                        } else {
                            console.log(`\n${data.errmsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else if (DD_BOT_TOKEN) {
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\n钉钉发送通知消息失败！\n')
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.errcode === 0) {
                            console.log('钉钉发送通知消息成功🎉')
                        } else {
                            console.log(`\n${data.errmsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else {
            console.log('您未提供钉钉机器人推送所需的 DD_BOT_TOKEN 或者 DD_BOT_SECRET ，取消钉钉推送消息通知🚫')
            resolve()
        }
    })
}

function qywxBotNotify(text, desp) {
    return new Promise((resolve) => {
        const options = {
            url: `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${QYWX_KEY}`,
            json: {
                msgtype: 'text',
                text: {
                    content: ` ${text}\n\n${desp}`,
                },
            },
            headers: {
                'Content-Type': 'application/json',
            },
            timeout,
        }
        if (QYWX_KEY) {
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\n企业微信发送通知消息失败！\n')
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.errcode === 0) {
                            console.log('企业微信发送通知消息成功🎉')
                        } else {
                            console.log(`${data.errmsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else {
            console.log('您未提供企业微信机器人推送所需的 QYWX_KEY ，取消企业微信推送消息通知🚫')
            resolve()
        }
    })
}

function ChangeUserId(desp) {
    const QYWX_AM_AY = QYWX_AM.split(',')
    if (QYWX_AM_AY[2]) {
        const userIdTmp = QYWX_AM_AY[2].split('|')
        let userId = ''
        for (let i = 0; i < userIdTmp.length; i++) {
            const count = '签到号 ' + (i + 1)
            if (desp.match(count)) {
                userId = userIdTmp[i]
            }
        }
        if (!userId) userId = QYWX_AM_AY[2]
        return userId
    } else {
        return '@all'
    }
}

function qywxamNotify(text, desp) {
    return new Promise((resolve) => {
        if (QYWX_AM) {
            const QYWX_AM_AY = QYWX_AM.split(',')
            const options_accesstoken = {
                url: `https://qyapi.weixin.qq.com/cgi-bin/gettoken`,
                json: {
                    corpid: `${QYWX_AM_AY[0]}`,
                    corpsecret: `${QYWX_AM_AY[1]}`,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout,
            }
            $.post(options_accesstoken, (err, resp, data) => {
                html = desp.replace(/\n/g, '<br/>')
                var json = JSON.parse(data)
                accesstoken = json.access_token
                let options

                switch (QYWX_AM_AY[4]) {
                    case '0':
                        options = {
                            msgtype: 'textcard',
                            textcard: {
                                title: `${text}`,
                                description: `${desp}`,
                                url: '',
                                btntxt: '更多',
                            },
                        }
                        break

                    case '1':
                        options = {
                            msgtype: 'text',
                            text: {
                                content: `${text}\n\n${desp}`,
                            },
                        }
                        break

                    default:
                        options = {
                            msgtype: 'mpnews',
                            mpnews: {
                                articles: [
                                    {
                                        title: `${text}`,
                                        thumb_media_id: `${QYWX_AM_AY[4]}`,
                                        author: `智能助手`,
                                        content_source_url: ``,
                                        content: `${html}`,
                                        digest: `${desp}`,
                                    },
                                ],
                            },
                        }
                }
                if (!QYWX_AM_AY[4]) {
                    //如不提供第四个参数,则默认进行文本消息类型推送
                    options = {
                        msgtype: 'text',
                        text: {
                            content: `${text}\n\n${desp}`,
                        },
                    }
                }
                options = {
                    url: `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accesstoken}`,
                    json: {
                        touser: `${ChangeUserId(desp)}`,
                        agentid: `${QYWX_AM_AY[3]}`,
                        safe: '0',
                        ...options,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }

                $.post(options, (err, resp, data) => {
                    try {
                        if (err) {
                            console.log('\n成员ID:' + ChangeUserId(desp) + '企业微信应用消息发送通知消息失败！\n')
                            console.log(err)
                        } else {
                            data = JSON.parse(data)
                            if (data.errcode === 0) {
                                console.log('成员ID:' + ChangeUserId(desp) + '企业微信应用消息发送通知消息成功🎉')
                            } else {
                                console.log(`\n${data.errmsg}\n`)
                            }
                        }
                    } catch (e) {
                        $.logErr(e, resp)
                    } finally {
                        resolve(data)
                    }
                })
            })
        } else {
            console.log('您未提供企业微信应用消息推送所需的 QYWX_AM ，取消企业微信应用消息推送消息通知🚫')
            resolve()
        }
    })
}

function iGotNotify(text, desp, params = {}) {
    return new Promise((resolve) => {
        if (IGOT_PUSH_KEY) {
            // 校验传入的IGOT_PUSH_KEY是否有效
            const IGOT_PUSH_KEY_REGX = new RegExp('^[a-zA-Z0-9]{24}$')
            if (!IGOT_PUSH_KEY_REGX.test(IGOT_PUSH_KEY)) {
                console.log('\n您所提供的 IGOT_PUSH_KEY 无效！\n')
                resolve()
                return
            }
            const options = {
                url: `https://push.hellyw.com/${IGOT_PUSH_KEY.toLowerCase()}`,
                body: `title=${text}&content=${desp}&${querystring.stringify(params)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout,
            }
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\n发送通知调用API失败！\n')
                        console.log(err)
                    } else {
                        if (typeof data === 'string') data = JSON.parse(data)
                        if (data.ret === 0) {
                            console.log('iGot发送通知消息成功🎉')
                        } else {
                            console.log(`\niGot发送通知消息失败：\n${data.errMsg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else {
            console.log('您未提供iGot所需的 IGOT_PUSH_KEY ，取消iGot推送消息通知🚫')
            resolve()
        }
    })
}

function pushPlusNotify(text, desp) {
    return new Promise((resolve) => {
        if (PUSH_PLUS_TOKEN) {
            desp = desp.replace(/[\n\r]/g, '<br>') // 默认为html, 不支持plaintext
            const body = {
                token: `${PUSH_PLUS_TOKEN}`,
                title: `${text}`,
                content: `${desp}`,
                topic: `${PUSH_PLUS_USER}`,
            }
            const options = {
                url: `http://www.pushplus.plus/send`,
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': ' application/json',
                },
                timeout,
            }
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log(`\npushplus发送${PUSH_PLUS_USER ? '一对多' : '一对一'}通知消息失败！\n`)
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.code === 200) {
                            console.log(`pushplus发送${PUSH_PLUS_USER ? '一对多' : '一对一'}通知消息成功🎉`)
                        } else {
                            console.log(`\npushplus发送${PUSH_PLUS_USER ? '一对多' : '一对一'}通知消息失败：\n${data.msg}\n`)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else {
            console.log('您未提供pushplus推送所需的 PUSH_PLUS_TOKEN ，取消pushplus推送消息通知🚫')
            resolve()
        }
    })
}

function wxPusherNotify(text, desp) {
    return new Promise((resolve) => {
        if (WP_APP_TOKEN) {
            let uids = []
            for (let i of WP_UIDS.split(';')) {
                if (i.length !== 0) uids.push(i)
            }
            let topicIds = []
            for (let i of WP_TOPICIDS.split(';')) {
                if (i.length !== 0) topicIds.push(i)
            }
            desp = `<font size="4"><b>${text}</b></font>\n\n<font size="3">${desp}</font>`
            desp = desp.replace(/[\n\r]/g, '<br>') // 默认为html, 不支持plaintext
            const body = {
                appToken: `${WP_APP_TOKEN}`,
                content: `${text}\n\n${desp}`,
                summary: `${text}`,
                contentType: 2,
                topicIds: topicIds,
                uids: uids,
                url: `${WP_URL}`,
            }
            const options = {
                url: `http://wxpusher.zjiecode.com/api/send/message`,
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout,
            }
            $.post(options, (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\nWxPusher发送通知调用 API 失败！\n')
                        console.log(err)
                    } else {
                        data = JSON.parse(data)
                        if (data.code === 1000) {
                            console.log('WxPusher发送通知消息成功🎉')
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data)
                }
            })
        } else {
            console.log('您未提供WxPusher推送所需的 WP_APP_TOKEN ，取消WxPusher推送消息通知🚫')
            resolve()
        }
    })
}

module.exports = {
    sendNotify,
}
// @formatter:off
// prettier-ignore
function Env(t,s){return new class{constructor(t,s){this.name=t,this.data=null,this.dataFile="box.dat",this.logs=[],this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}getScript(t){return new Promise(s=>{$.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=s&&s.timeout?s.timeout:o;const[h,a]=i.split("@"),r={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":h,Accept:"*/*"}};$.post(r,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),o=JSON.stringify(this.data);e?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(s,o):this.fs.writeFileSync(t,o)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return e;return o}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),o=e?this.getval(e):"";if(o)try{const t=JSON.parse(o);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(s),h=this.getval(i),a=i?"null"===h?null:h||"{}":"{}";try{const s=JSON.parse(a);this.lodash_set(s,o,t),e=this.setval(JSON.stringify(s),i)}catch(s){const h={};this.lodash_set(h,o,t),e=this.setval(JSON.stringify(h),i)}}else e=$.setval(t,s);return e}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isLoon()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status),s(t,e,i)}):this.isQuanX()?$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t)):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t)))}post(t,s=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),delete t.headers["Content-Length"],this.isSurge()||this.isLoon())$httpClient.post(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status),s(t,e,i)});else if(this.isQuanX())t.method="POST",$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t));else if(this.isNode()){this.initGotEnv(t);const{url:e,...i}=t;this.got.post(e,i).then(t=>{const{statusCode:e,statusCode:i,headers:o,body:h}=t;s(null,{status:e,statusCode:i,headers:o,body:h},h)},t=>s(t))}}time(t){let s={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in s)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?s[e]:("00"+s[e]).substr((""+s[e]).length)));return t}msg(s=t,e="",i="",o){const h=t=>!t||!this.isLoon()&&this.isSurge()?t:"string"==typeof t?this.isLoon()?t:this.isQuanX()?{"open-url":t}:void 0:"object"==typeof t&&(t["open-url"]||t["media-url"])?this.isLoon()?t["open-url"]:this.isQuanX()?t:void 0:void 0;$.isMute||(this.isSurge()||this.isLoon()?$notification.post(s,e,i,h(o)):this.isQuanX()&&$notify(s,e,i,h(o))),this.logs.push("","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="),this.logs.push(s),e&&this.logs.push(e),i&&this.logs.push(i)}log(...t){t.length>0?this.logs=[...this.logs,...t]:console.log(this.logs.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();e?$.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):$.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,s)}
// @formatter:on
