import type { alertConfigNotifyModel, messageModel } from '../../../db'
import { logger } from '../../../utils/logger'
import axios from 'axios'

export async function sendTelegramNotification(msg: messageModel, notification: alertConfigNotifyModel) {
  try {
    // target格式应该是 "botToken:chatId" 或者只是 "botToken"（这种情况下chatId在额外参数中）
    const [botToken, chatId] = notification.target.split(':')
    const title = msg.title
    const content = msg.content

    if (!botToken || !chatId) {
      logger.error(`Invalid Telegram configuration. Target should be in format "botToken:chatId"`)
      return
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const text = `${title}\n\n${content}`

    const response = await axios.post(url, {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.data.ok) {
      logger.log(`Telegram notification sent successfully: ${title}`)
    }
    else {
      logger.error(`Failed to send Telegram notification: ${title}, error: ${JSON.stringify(response.data)}`)
    }
  }
  catch (e: any) {
    logger.error(`Error sending Telegram notification to ${notification.target}: ${msg.title}`, e.message || e)
  }
}
