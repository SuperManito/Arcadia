import type { messageModel, messageWhereInput } from '../../db'
import type { MessageData } from '../type/message'
import { createHash } from 'node:crypto'
import { SocketEvent } from '../type/socket'
import { db } from '../../db'
import { logger } from '../../utils/logger'
import { validateObject } from '../../utils'
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_TITLE_MAX_LENGTH,
  MessageCategory,
  MessageScope,
  MessageType,
} from '../type/message'
import { processMessageAlert } from './alert'
import { socketCommon } from '../../server/socketCommon'

// 消息去重缓存（FIFO 淘汰）
const DEDUP_MAX_SIZE = 100
const DEDUP_WINDOW_MS = 30 * 1000
const dedupCache = new Map<string, number>() // fingerprint → timestamp

/**
 * 检查是否重复消息
 */
function isDuplicate(fingerprint: string): boolean {
  const timestamp = dedupCache.get(fingerprint)
  if (timestamp === undefined)
    return false
  if (Date.now() - timestamp < DEDUP_WINDOW_MS)
    return true
  // 过期，清除
  dedupCache.delete(fingerprint)
  return false
}

function registerDedup(fingerprint: string) {
  // 借新消息入库时机清理过期项，避免窗口内不重复访问的条目滞留占位
  const now = Date.now()
  for (const [key, timestamp] of dedupCache) {
    if (now - timestamp >= DEDUP_WINDOW_MS) {
      dedupCache.delete(key)
    }
  }
  dedupCache.set(fingerprint, now)
  if (dedupCache.size > DEDUP_MAX_SIZE) {
    const firstKey = dedupCache.keys().next().value
    if (firstKey !== undefined)
      dedupCache.delete(firstKey)
  }
}

/**
 * 发送消息
 *
 * 返回 true 表示新消息已入库，false 表示窗口内重复消息被丢弃
 */
export async function sendMessage(data: MessageData): Promise<boolean> {
  const rawTitle = (data.title ?? '').trim()
  const rawContent = (data.content ?? '').trim()
  const title = rawTitle.slice(0, MESSAGE_TITLE_MAX_LENGTH)
  const content = rawContent.slice(0, MESSAGE_CONTENT_MAX_LENGTH)
  if (rawContent.length > MESSAGE_CONTENT_MAX_LENGTH) {
    logger.warn('[消息中心] 消息内容超长被截断', JSON.stringify({ title: rawTitle, length: rawContent.length, maxLength: MESSAGE_CONTENT_MAX_LENGTH }))
  }
  const category = data.category || MessageCategory.SYSTEM
  const type = data.type || MessageType.INFO

  validateObject({ title, content, category, type }, [
    ['title', [true, 'string']],
    ['content', [true, 'string']],
    ['category', [false, Object.values(MessageCategory)]],
    ['type', [false, Object.values(MessageType)]],
  ])

  const contentHash = createHash('md5').update(content).digest('hex')
  const fingerprint = `${category}:${type}:${title}:${contentHash}`
  if (isDuplicate(fingerprint))
    return false
  registerDedup(fingerprint)

  let msg: messageModel
  try {
    msg = await db.message.$create({ title, content, category, type })
  }
  catch (e) {
    dedupCache.delete(fingerprint)
    throw e
  }

  // 消息中心监控告警：非阻塞触发，外部渠道延迟不影响消息写入路径；
  // 告警匹配使用入库截断前的完整正文，超长名单尾部不会静默丢失；
  // 失败汇总的落库出口就地注入，队列与会话模块不反向依赖消息入库
  if (!data.skipAlert) {
    void processMessageAlert(msg, rawContent, (title, content) => sendMessage({
      title,
      content,
      category: MessageCategory.SYSTEM,
      type: MessageType.ERROR,
      skipAlert: true,
    })).catch((e: any) => {
      logger.error('[消息中心监控告警] 触发异常', e)
    })
  }

  // 通过 WebSocket 推送新消息
  socketCommon.emit(SocketEvent.MESSAGE_NEW, {
    id: msg.id,
    category: msg.category,
    type: msg.type,
    title: msg.title,
    create_time: msg.create_time,
  })

  return true
}

/**
 * 面向外部用户集成的消息推送方法
 *
 * category 固定为 user
 * title 和 content 为必填，缺失时直接抛出错误
 */
export async function sendUserMessage(data: { title: string, content: string, type?: MessageType }) {
  return await sendMessage({
    title: data.title,
    content: data.content,
    category: MessageCategory.USER,
    type: data.type ?? MessageType.INFO,
  })
}

/**
 * 获取未读消息数量
 */
export async function getUnreadCount(scope: MessageScope = MessageScope.ALL): Promise<number> {
  const where: messageWhereInput = { status: 0 }
  if (scope === MessageScope.USER) {
    where.category = MessageCategory.USER
  }
  return await db.message.count({ where })
}

/**
 * 删除已读消息
 */
export async function cleanReadMessages(days: number) {
  const cutoffDate = new Date(Date.now() - days * 86400000)
  const result = await db.message.deleteMany({
    where: {
      status: 1,
      create_time: { lt: cutoffDate },
    },
  })
  return { count: result.count }
}
