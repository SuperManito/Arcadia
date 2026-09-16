import { SocketEvent } from '../type/socket'
import type { messageWhereInput } from '../../db'
import { createHash } from 'node:crypto'
import { db } from '../../db'
import { logger } from '../../utils/logger'
import { validateObject } from '../../utils'
import type { MessageData } from '../type/message'
import { MessageCategory, MessageScope, MessageType } from '../type/message'
import { processMessageAlert } from './alert'
import { socketCommon } from '../../server/socketCommon'

// 消息去重缓存（FIFO 淘汰）
const DEDUP_MAX_SIZE = 50
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 分钟
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

/**
 * 注册新消息到去重缓存
 */
function registerDedup(fingerprint: string) {
  dedupCache.set(fingerprint, Date.now())
  if (dedupCache.size > DEDUP_MAX_SIZE) {
    const firstKey = dedupCache.keys().next().value
    if (firstKey !== undefined)
      dedupCache.delete(firstKey)
  }
}

// 内容长度限制，超出部分截断
const TITLE_MAX_LENGTH = 200
const CONTENT_MAX_LENGTH = 20000

/**
 * 发送消息
 * @returns true=新消息已创建，false=重复消息已丢弃
 */
export async function sendMessage(data: MessageData): Promise<boolean> {
  const title = (data.title ?? '').trim().slice(0, TITLE_MAX_LENGTH)
  const content = (data.content ?? '').trim().slice(0, CONTENT_MAX_LENGTH)
  const category = data.category || MessageCategory.SYSTEM
  const type = data.type || MessageType.INFO

  validateObject({ title, content, category, type }, [
    ['title', [true, 'string']],
    ['content', [true, 'string']],
    ['category', [false, Object.values(MessageCategory)]],
    ['type', [false, Object.values(MessageType)]],
  ])

  // 消息去重
  const contentHash = createHash('md5').update(content).digest('hex')
  const fingerprint = `${title}:${contentHash}`
  if (isDuplicate(fingerprint))
    return false

  // 插入
  const msg = await db.message.$create({ title, content, category, type })

  // 注册去重缓存
  registerDedup(fingerprint)

  // 消息中心监控告警：非阻塞触发，外部渠道延迟不影响消息写入路径
  if (!data.skipAlert) {
    void processMessageAlert(msg).catch((e: any) => {
      logger.error('[消息中心监控告警] 触发异常', e?.message ?? e)
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
export async function pushUserMessage(data: { title: string, content: string, type?: MessageType }) {
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
