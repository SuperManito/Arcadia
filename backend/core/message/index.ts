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

interface messageInfo {
  taskId?: number
}

export async function sendTextMessage(str: string, info: messageInfo = {}) {
  if (str.startsWith('{') && str.endsWith('}')) {
    return await sendMessage(JSON.parse(str))
  }
  return await sendMessage({
    title: `未知消息:${str.substring(0, 20)}`,
    content: str,
    source: 'user',
    category: 'info',
  }, info)
}

/**
 * 发送消息
 *
 * @async
 */
export async function sendMessage(data: MessageData, info: messageInfo = {}) {
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
  if (info.taskId) {
    logger.debug(`发送消息任务ID:${info.taskId},data:`, data, info)
  }
  data = cleanProperties(data, ['title', 'content', 'source', 'category'])
  const msg = await db.message.$create(data)

  // 处理消息告警逻辑
  await processMessageAlert(msg as messageModel)
  return true
}
