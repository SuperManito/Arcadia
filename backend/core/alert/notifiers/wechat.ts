import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendWechatNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const target = notification.target // 微信Webhook URL或相关配置
    const title = msg.title
    const content = msg.content

    // 如果target是企业微信机器人webhook
    if (target.startsWith('https://qyapi.weixin.qq.com')) {
      const response = await axios.post(target, {
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
        logger.log(`WeChat notification sent successfully: ${title}`)
      }
      else {
        logger.error(`Failed to send WeChat notification: ${title}, error: ${response.data.errmsg}`)
      }
      return
    }

    // 其他微信通知方式需要根据具体实现处理
    logger.log(`WeChat notification processed: ${title} (specific implementation depends on target configuration)`)
  }
  catch (error) {
    logger.error(`Error sending WeChat notification to ${notification.target}: ${msg.title}`, error)
  }
}
