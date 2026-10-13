import type { PushResult } from '../../channel'
import type { PushSession } from './pushSession'
import { getChannelTypeConcurrency, pushChannel } from '../../channel'
import { logger } from '../../../utils/logger'
import { settleSession, truncateSummaryContent } from './pushSession'

// 队列长度越过阈值时各记一条 warn 提示积压，不改变任何行为：任务只延迟不丢弃
const QUEUE_BACKLOG_WARN_LEVELS = [1000, 10000]

export interface PushChannel {
  name: string
  type: string
  config: string
}

export interface PushTask {
  channel: PushChannel
  title: string
  content: string
  ruleName: string
  priority: boolean
  session: PushSession
}

interface ChannelQueue {
  tasks: PushTask[]
  active: number
  warnedLevel: number
}

// 按渠道类型分桶，在途消费循环数不超过该类型的节流并发上限、实际速率由节流器统一约束；
// 全局消息插队头且同优先级保持先进先出；内存态不持久化，重启丢队列符合 best-effort 语义
const queues = new Map<string, ChannelQueue>()

function getQueue(type: string) {
  let queue = queues.get(type)
  if (!queue) {
    queue = { tasks: [], active: 0, warnedLevel: 0 }
    queues.set(type, queue)
  }
  return queue
}

function warnBacklog(type: string, queue: ChannelQueue) {
  const level = QUEUE_BACKLOG_WARN_LEVELS.find(size => queue.tasks.length >= size && queue.warnedLevel < size)
  if (level !== undefined) {
    queue.warnedLevel = level
    logger.warn('[消息中心监控告警] 推送队列积压', { channelType: type, depth: queue.tasks.length })
  }
  if (queue.tasks.length < queue.warnedLevel) {
    queue.warnedLevel = 0
  }
}

function settle(task: PushTask, error?: string) {
  settleSession(task.session, error
    ? {
        ruleName: task.ruleName,
        channelName: task.channel.name,
        channelType: task.channel.type,
        reason: error,
        content: task.priority ? truncateSummaryContent(task.content) : task.content,
      }
    : undefined)
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
 * 入队：任务只延迟不丢弃；全局消息传 priority 插队头优先发送
 */
export function enqueuePush(
  channel: PushChannel,
  payload: { title: string, content: string },
  meta: { ruleName: string },
  session: PushSession,
  priority = false,
): void {
  const task: PushTask = { channel, ...payload, ...meta, priority, session }
  session.pending++
  const queue = getQueue(channel.type)
  if (priority) {
    const idx = queue.tasks.findIndex(item => !item.priority)
    if (idx === -1) {
      queue.tasks.push(task)
    }
    else {
      queue.tasks.splice(idx, 0, task)
    }
  }
  else {
    queue.tasks.push(task)
  }
  warnBacklog(channel.type, queue)
  topUp(channel.type)
}
