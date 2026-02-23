import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendPushplusNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const token = notification.target
    const title = msg.title
    const content = msg.content.replace(/\n/g, '<br>')

    const response = await axios.post('http://www.pushplus.plus/send', {
      token,
      title,
      content,
      template: 'html',
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data.code === 200) {
      logger.log(`PushPlus notification sent successfully: ${title}`)
    }
    else {
      logger.error(`Failed to send PushPlus notification: ${title}, error: ${response.data.msg}`)
    }
  }
  catch (error) {
    logger.error(`Error sending PushPlus notification to ${notification.target}: ${msg.title}`, error)
  }
}
