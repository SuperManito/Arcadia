import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendBarkNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const target = notification.target
    const title = msg.title
    const content = msg.content

    // 从target中解析Bark服务地址和可能的其他参数
    const [baseUrl, paramsStr] = target.split('?')
    const fullUrl = paramsStr
      ? `${baseUrl}/${encodeURIComponent(title)}/${encodeURIComponent(content)}?${paramsStr}`
      : `${baseUrl}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`

    const response = await axios.get(fullUrl)
    if (response.status === 200) {
      logger.log(`Bark notification sent successfully to ${target}: ${title}`)
    }
    else {
      logger.error(`Failed to send Bark notification to ${target}: ${title}, status: ${response.status}`)
    }
  }
  catch (e: any) {
    logger.error(`Error sending Bark notification to ${notification.target}: ${msg.title}`, e.message || e)
  }
}
