import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendQywxBotNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const key = notification.target // 企业微信机器人的key
    const title = msg.title
    const content = msg.content

    const url = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`

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
      logger.log(`QYWX Bot notification sent successfully: ${title}`)
    }
    else {
      logger.error(`Failed to send QYWX Bot notification: ${title}, error: ${response.data.errmsg}`)
    }
  }
  catch (error) {
    logger.error(`Error sending QYWX Bot notification to ${notification.target}: ${msg.title}`, error)
  }
}
