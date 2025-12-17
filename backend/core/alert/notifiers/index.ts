import { sendWebNotification } from './web'
import { sendWechatNotification } from './wechat'
import { sendDingtalkNotification } from './dingtalk'
import { sendEmailNotification } from './email'
import { sendSmsNotification } from './sms'
import { sendBarkNotification } from './bark'
import { sendPushplusNotification } from './pushplus'
import { sendServerchanNotification } from './serverchan'
import { sendTelegramNotification } from './telegram'
import { sendQywxBotNotification } from './qywxbot'
import { sendIgotNotification } from './igot'
import { sendWxPusherNotification } from './wxpusher'
import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'

export const notifierRegistry: Record<string, (msg: messageModel, notification: alertConfigNotifyModel) => Promise<void>> = {
  web: sendWebNotification,
  wechat: sendWechatNotification,
  dingtalk: sendDingtalkNotification,
  email: sendEmailNotification,
  sms: sendSmsNotification,
  bark: sendBarkNotification,
  pushplus: sendPushplusNotification,
  serverchan: sendServerchanNotification,
  telegram: sendTelegramNotification,
  qywxbot: sendQywxBotNotification,
  igot: sendIgotNotification,
  wxpusher: sendWxPusherNotification,
}

export async function sendNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  const sender = notifierRegistry[notification.type]
  if (sender) {
    return await sender(msg, notification)
  }
  else {
    logger.warn(`Unknown notification type: ${notification.type}`)
  }
}
