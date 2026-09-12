import type { Pusher } from './types'
import pushApprise from './channels/apprise'
import pushBark from './channels/bark'
import pushDingDing from './channels/dingding'
import pushDiscord from './channels/discord'
import pushFeishu from './channels/feishu'
import pushGoogleChat from './channels/googlechat'
import pushGotify from './channels/gotify'
import pushKook from './channels/kook'
import pushPushplus from './channels/pushplus'
import pushServerChan from './channels/serverchan'
import pushTelegram from './channels/telegram'
import pushWebhook from './channels/webhook'
import pushWeComApp from './channels/wecomapp'
import pushWeComBot from './channels/wecombot'
import pushWPush from './channels/wpush'
import pushWxPusher from './channels/wxpusher'

const registry = new Map<string, Pusher>()

/**
 * 注册渠道推送器
 *
 * @param type 渠道类型唯一键，取值见 CHANNEL_TYPES
 * @param pusher 推送器函数，签名见 Pusher
 */
export function registerPusher(type: string, pusher: Pusher) {
  registry.set(type, pusher)
}

/**
 * 按渠道类型取已注册的推送器
 *
 * @param type 渠道类型唯一键
 */
export function getPusher(type: string) {
  return registry.get(type)
}

// 渠道注册聚合：新增渠道时在此登记
registerPusher('apprise', pushApprise)
registerPusher('bark', pushBark)
registerPusher('dingding', pushDingDing)
registerPusher('discord', pushDiscord)
registerPusher('feishu', pushFeishu)
registerPusher('googlechat', pushGoogleChat)
registerPusher('gotify', pushGotify)
registerPusher('kook', pushKook)
registerPusher('pushplus', pushPushplus)
registerPusher('serverchan', pushServerChan)
registerPusher('telegram', pushTelegram)
registerPusher('webhook', pushWebhook)
registerPusher('wecomapp', pushWeComApp)
registerPusher('wecombot', pushWeComBot)
registerPusher('wpush', pushWPush)
registerPusher('wxpusher', pushWxPusher)
