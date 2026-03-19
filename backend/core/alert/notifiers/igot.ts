import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendIgotNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    const pushKey = notification.target // iGot的推送key
    const title = msg.title
    const content = msg.content

    // 校验pushKey格式
    const pushKeyRegx = /^[a-z0-9]{24}$/i
    if (!pushKeyRegx.test(pushKey)) {
      logger.error(`Invalid iGot push key format: ${pushKey}`)
      return
    }

    const url = `https://push.hellyw.com/${pushKey.toLowerCase()}`

    const response = await axios.post(url, `title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = response.data
    if (typeof data === 'string') {
      try {
        const parsedData = JSON.parse(data)
        if (parsedData.ret === 0) {
          logger.log(`iGot notification sent successfully: ${title}`)
        }
        else {
          logger.error(`Failed to send iGot notification: ${title}, error: ${parsedData.errMsg}`)
        }
      }
      catch (err) {
        logger.error(`Failed to parse iGot response: ${data},err:${err}`)
      }
    }
    else if (data.ret === 0) {
      logger.log(`iGot notification sent successfully: ${title}`)
    }
    else {
      logger.error(`Failed to send iGot notification: ${title}, error: ${data.errMsg}`)
    }
  }
  catch (e: any) {
    logger.error(e.message || e)
  }
}
