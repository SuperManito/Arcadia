import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendWebNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const target = notification.target // Webhook URL
    const title = msg.title
    const content = msg.content

    // 发送到Webhook
    const response = await axios.post(target, {
      title,
      content,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
        // 可以根据需要添加认证头部
        // 'Authorization': 'Bearer ' + token
      },
    })

    if (response.status === 200) {
      logger.log(`Web notification sent successfully to ${target}: ${title}`)
    }
    else {
      logger.error(`Failed to send Web notification to ${target}: ${title}, status: ${response.status}`)
    }
  }
  catch (e: any) {
    logger.error(`Error sending Web notification to ${notification.target}: ${msg.title}`, e.message || e)
  }
}
