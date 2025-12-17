import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendWxPusherNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    // target 应该是 appToken
    const appToken = notification.target
    const title = msg.title
    const content = msg.content

    if (!appToken) {
      logger.error(`Invalid WxPusher configuration. Missing appToken.`)
      return
    }

    const url = 'http://wxpusher.zjiecode.com/api/send/message'

    // 解析额外参数
    let uids: string[] = []
    let topicIds: string[] = []

    if (notification.ext) {
      try {
        const extra = JSON.parse(notification.ext)
        if (extra.uids)
          uids = Array.isArray(extra.uids) ? extra.uids : [extra.uids]
        if (extra.topicIds)
          topicIds = Array.isArray(extra.topicIds) ? extra.topicIds : [extra.topicIds]
      }
      catch (parseError) {
        logger.warn('Failed to parse WxPusher extra parameters', parseError)
      }
    }

    const response = await axios.post(url, {
      appToken,
      content: `${title}\n\n${content}`,
      summary: title,
      contentType: 1, // 1表示文本
      topicIds,
      uids,
      url: '', // 可选的跳转链接
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data.code === 1000) {
      logger.log(`WxPusher notification sent successfully: ${title}`)
    }
    else {
      logger.error(`Failed to send WxPusher notification: ${title}, error: ${response.data.message}`)
    }
  }
  catch (error) {
    logger.error(`Error sending WxPusher notification to ${notification.target}: ${msg.title}`, error)
  }
}
