import type { messageModel } from '../../db'
import { db } from '../../db'
import { cleanProperties, validateObject } from '../../utils'
import { processMessageAlert } from '../alert'
import { logger } from '../../utils/logger'

interface MessageData {
  title: string
  content: string
  source: 'system' | 'user'
  category: 'info' | 'error' | 'warn'
}

export async function sendTextMessage(str: string) {
  if (str.startsWith('{') && str.endsWith('}')) {
    return await sendMessage(JSON.parse(str))
  }
  return await sendMessage({
    title: `未知消息:${str.substring(0, 20)}`,
    content: str,
    source: 'user',
    category: 'info',
  })
}

/**
 * 发送消息
 *
 * @async
 */
export async function sendMessage(data: MessageData) {
  try {
    validateObject(data, [
      ['title', [true, 'string']],
      ['content', [false, 'string']],
      ['source', [true, ['system', 'user']]],
      ['category', [false, ['info', 'error', 'warn']]],
    ])
  }
  catch (e) {
    logger.error('发送消息参数错误:', e)
    return false
  }
  data = cleanProperties(data, ['title', 'content', 'source', 'category'])
  const msg = await db.message.$create(data)

  // 处理消息告警逻辑
  await processMessageAlert(msg as messageModel)
  return true
}
