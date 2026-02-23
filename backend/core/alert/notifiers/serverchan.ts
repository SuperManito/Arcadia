import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendServerchanNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const sckey = notification.target
    const title = msg.title
    const content = msg.content.replace(/\n/g, '\n\n') // Server酱需要两个换行符才能换行

    const url = sckey.includes('SCT')
      ? `https://sctapi.ftqq.com/${sckey}.send`
      : `https://sc.ftqq.com/${sckey}.send`

    const response = await axios.post(url, `text=${encodeURIComponent(title)}&desp=${encodeURIComponent(content)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = response.data
    if (data.errno === 0 || data.data?.errno === 0) {
      logger.log(`ServerChan notification sent successfully: ${title}`)
    }
    else if (data.errno === 1024) {
      logger.warn(`ServerChan notification send warning: ${data.errmsg}`)
    }
    else {
      logger.error(`Failed to send ServerChan notification: ${title}, error: ${JSON.stringify(data)}`)
    }
  }
  catch (error) {
    logger.error(`Error sending ServerChan notification to ${notification.target}: ${msg.title}`, error)
  }
}
