import type { PushResult } from '../../../channel'
import { getChannelTypeConcurrency, pushChannel } from '../../../channel'
import { logger } from '../../../../utils/logger'
import { MessageCategory, MessageType } from '../../../type/message'
import { sendMessage } from '../../index'

// 一对一任务常规深度上限：持续积压时丢弃新任务，防止内存无限增长；只统计一对一任务，全局消息不占深度
const DIRECT_QUEUE_MAX_DEPTH = 200
// 全局消息豁免常规深度，仅受绝对上限兜底：渠道长时间不可用且全局消息持续入队的最后边界
const DIRECT_QUEUE_HARD_LIMIT = 1000

// sendMessage 入库按 20000 字符截断，汇总按低于该值的行数分片写多条
const SUMMARY_CONTENT_MAX_LENGTH = 19000

// 全局规则行携带整条正文，批量失败时行体积线性放大分片数，只保留前缀供识别，原文见触发消息
const SUMMARY_ROW_CONTENT_MAX_LENGTH = 200

function truncateSummaryContent(content: string) {
  return content.length > SUMMARY_ROW_CONTENT_MAX_LENGTH
    ? `${content.slice(0, SUMMARY_ROW_CONTENT_MAX_LENGTH)}……（截断，原文见触发消息）`
    : content
}

export interface DirectPushFailure {
  ruleName: string
  channelName: string
  channelType: string
  reason: string
  content: string
}

/**
 * 同一条触发消息的推送失败汇总会话：任务落定逐个销账，pending 归零且存在失败时写汇总消息（skipAlert 防环）
 * pending 初值 1 为封口哨兵，防止先入队的失败在后续任务尚未入队前提前归零 flush 出多条汇总
 */
export interface DirectPushSession {
  title: string
  pending: number
  failures: DirectPushFailure[]
}

export interface DirectPushChannel {
  name: string
  type: string
  config: string
}

interface DirectPushTask {
  channel: DirectPushChannel
  title: string
  content: string
  ruleName: string
  priority: boolean
  session: DirectPushSession
}

interface ChannelQueue {
  tasks: DirectPushTask[]
  active: number
}

// 按渠道类型分桶，在途消费循环数不超过该类型的节流并发上限、实际速率由节流器统一约束；
// 全局消息插队头且同优先级保持先进先出；内存态不持久化，重启丢队列符合 best-effort 语义
const queues = new Map<string, ChannelQueue>()

function getQueue(type: string) {
  let queue = queues.get(type)
  if (!queue) {
    queue = { tasks: [], active: 0 }
    queues.set(type, queue)
  }
  return queue
}

// md 表格单元格物理上不能含换行与竖线，写入前统一转换
function toCell(text: string) {
  return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')
}

function buildSummaryContent(session: DirectPushSession, rows: string[]) {
  return `触发消息：${session.title}\n\n| 规则 | 渠道 | 原因 | 原推送内容 |\n| --- | --- | --- | --- |\n${rows.join('\n')}`
}

// 按 sendMessage 的入库截断上限分片，避免表格尾部行丢失；每片独立一条汇总消息
function flushSession(session: DirectPushSession) {
  const rows = session.failures.map(({ ruleName, channelName, channelType, reason, content }) =>
    `| ${toCell(ruleName)} | ${toCell(channelName)}（${channelType}） | ${toCell(reason)} | ${toCell(content)} |`)
  const header = buildSummaryContent(session, [])
  const chunks: string[][] = [[]]
  let length = header.length
  for (const row of rows) {
    if (length + row.length + 1 > SUMMARY_CONTENT_MAX_LENGTH && chunks[chunks.length - 1].length > 0) {
      chunks.push([])
      length = header.length
    }
    chunks[chunks.length - 1].push(row)
    length += row.length + 1
  }
  return Promise.all(chunks.map((chunk, index) => sendMessage({
    title: chunks.length > 1 ? `告警消息推送失败（${index + 1}/${chunks.length}）` : '告警消息推送失败',
    content: buildSummaryContent(session, chunk),
    category: MessageCategory.SYSTEM,
    type: MessageType.ERROR,
    skipAlert: true,
  })))
}

function tryFlush(session: DirectPushSession) {
  if (session.pending === 0 && session.failures.length > 0) {
    // 汇总消息内容在首个 await 前同步组装，与后续新入队任务互不干扰
    void flushSession(session).catch(() => {})
  }
}

function settle(task: DirectPushTask, error?: string) {
  const session = task.session
  if (error) {
    session.failures.push({
      ruleName: task.ruleName,
      channelName: task.channel.name,
      channelType: task.channel.type,
      reason: error,
      content: task.priority ? truncateSummaryContent(task.content) : task.content,
    })
  }
  session.pending--
  tryFlush(session)
}

/**
 * 匹配阶段失败（如关键字正则执行异常）没有对应推送任务，直接记入失败会话随汇总上报
 */
export function recordSessionFailure(session: DirectPushSession, failure: DirectPushFailure) {
  session.failures.push(failure)
}

/**
 * 处理链路结束时的封口：销掉哨兵名额，归零后按条件 flush
 */
export function closeSession(session: DirectPushSession) {
  session.pending--
  tryFlush(session)
}

// 补足消费循环：入队与循环退出时都调用，保证慢任务不阻塞其余循环的新建（串行化会让节流器的并发与窗口突发能力失效）
function topUp(type: string) {
  const queue = queues.get(type)
  if (!queue) {
    return
  }
  while (queue.active < getChannelTypeConcurrency(type) && queue.tasks.length > 0) {
    queue.active++
    void (async () => {
      try {
        // 并行循环从队头取任务，同渠道任务可能乱序送达，渠道间消息相互独立
        let task = queue.tasks.shift()
        while (task) {
          let result: PushResult
          try {
            result = await pushChannel(
              { type: task.channel.type, config: task.channel.config },
              { title: task.title, content: task.content },
            )
          }
          catch (e: any) {
            // pushChannel 契约上不抛错，兜底防止任务永不落定导致会话泄漏
            result = { success: false, error: `推送失败：${e?.message ?? '未知错误'}` }
          }
          settle(task, result.success ? undefined : result.error)
          task = queue.tasks.shift()
        }
      }
      finally {
        queue.active--
        topUp(type)
      }
    })().catch((e: any) => {
      // 消费循环是 fire-and-forget，未捕获的 rejection 会直接终止进程
      logger.error('[消息中心监控告警] 推送队列执行异常', { channelType: type, error: e?.message })
    })
  }
}

/**
 * 入队：超限丢弃计入失败会话；全局消息传 priority 插队头并豁免常规深度，仅受绝对上限约束
 */
export function enqueueDirectPush(
  channel: DirectPushChannel,
  payload: { title: string, content: string },
  meta: { ruleName: string },
  session: DirectPushSession,
  priority = false,
): void {
  const task: DirectPushTask = { channel, ...payload, ...meta, priority, session }
  session.pending++
  const queue = getQueue(channel.type)
  if (priority) {
    if (queue.tasks.length >= DIRECT_QUEUE_HARD_LIMIT) {
      settle(task, `队列积压超过 ${DIRECT_QUEUE_HARD_LIMIT} 条，任务丢弃`)
      return
    }
    const idx = queue.tasks.findIndex(item => !item.priority)
    if (idx === -1) {
      queue.tasks.push(task)
    }
    else {
      queue.tasks.splice(idx, 0, task)
    }
  }
  else {
    // 深度只统计一对一任务，全局消息豁免常规深度、不挤占名额
    const depth = queue.tasks.reduce((count, item) => item.priority ? count : count + 1, 0)
    if (depth >= DIRECT_QUEUE_MAX_DEPTH) {
      settle(task, `队列积压超过 ${DIRECT_QUEUE_MAX_DEPTH} 条，任务丢弃`)
      return
    }
    queue.tasks.push(task)
  }
  topUp(channel.type)
}
