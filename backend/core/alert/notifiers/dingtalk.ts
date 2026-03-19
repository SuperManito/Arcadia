import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'
import * as crypto from 'node:crypto'

export async function sendDingtalkNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const target = notification.target
    const title = msg.title
    const content = msg.content

    // target格式可能是 webhook 或 webhook:secret
    const [webhook, secret] = target.split(':')

    let url = `https://oapi.dingtalk.com/robot/send?access_token=${webhook}`

    // 如果提供了签名密钥，则添加签名参数
    if (secret) {
      const timestamp = Date.now()
      const stringToSign = `${timestamp}\n${secret}`
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(stringToSign)
      const sign = encodeURIComponent(hmac.digest('base64'))
      url = `${url}&timestamp=${timestamp}&sign=${sign}`
    }

    const response = await axios.post(url, {
      msgtype: 'text',
      text: {
        content: `${title}\n\n${content}`,
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data.errcode === 0) {
      logger.log(`DingTalk notification sent successfully: ${title}`)
    }
    else {
      logger.error(`Failed to send DingTalk notification: ${title}, error: ${response.data.errmsg}`)
    }
  }
  catch (e: any) {
    logger.error(`Error sending DingTalk notification to ${notification.target}: ${msg.title}`, e.message || e)
  }
}
