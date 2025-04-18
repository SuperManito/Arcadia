import { message as db } from '../db'
import { cleanProperties, validateObject } from '../utils'

interface MessageData {
  title: string
  content: string
  source: 'system' | 'user'
  category: 'info' | 'error' | 'warn'
}

/**
 * 发送消息
 *
 * @async
 */
export async function sendMessage(data: MessageData) {
  validateObject(data, [
    ['title', [true, 'string']],
    ['content', [false, 'string']],
    ['source', [true, ['system', 'user']]],
    ['category', [false, ['info', 'error', 'warn']]],
  ])
  data = cleanProperties(data, ['title', 'content', 'source', 'category'])
  return await db.$create(data)
}
