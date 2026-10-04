import type { notificationChannelModel } from '../../../../db'
import { pushChannel } from '../../../channel'
import { logger } from '../../../../utils/logger'
import { MessageCategory, MessageType } from '../../../type/message'
import { sendMessage } from '../../index'

// 单渠道队列深度上限：渠道挂死时丢弃新任务，防止内存无限积压
const DIRECT_QUEUE_MAX_DEPTH = 200

interface DirectPushTask {
  channel: notificationChannelModel
  title: string
  content: string
  originalTitle: string
  ruleName: string
}

interface ChannelQueue {
  tasks: DirectPushTask[]
  draining: boolean
}

// per-channel FIFO 串行，不同渠道天然并行；内存态不持久化，重启丢队列符合 best-effort 语义
const queues = new Map<number, ChannelQueue>()

async function reportDirectError(title: string, task: DirectPushTask, error: string) {
  const content = `触发消息：${task.originalTitle}\n规则：${task.ruleName}\n渠道：${task.channel.name}（${task.channel.type}）\n错误：${error}`
  await sendMessage({
    title,
    content,
    category: MessageCategory.SYSTEM,
    type: MessageType.ERROR,
    skipAlert: true,
  })
}

function drain(channelId: number) {
  const queue = queues.get(channelId)
  if (!queue || queue.draining) {
    return
  }
  queue.draining = true
  void (async () => {
    try {
      let task = queue.tasks.shift()
      while (task) {
        const result = await pushChannel(
          { type: task.channel.type, config: task.channel.config },
          { title: task.title, content: task.content },
        )
        if (!result.success) {
          logger.error('[消息中心监控告警] 一对一渠道发送失败', {
            channelId: task.channel.id,
            channelName: task.channel.name,
            channelType: task.channel.type,
            ruleName: task.ruleName,
            error: result.error,
          })
          await reportDirectError('告警消息推送失败', task, result.error ?? '未知错误').catch(() => {})
        }
        task = queue.tasks.shift()
      }
    }
    finally {
      // 循环退出与复位之间存在入队窗口，留给下次 drain 兜底
      queue.draining = false
      if (queue.tasks.length > 0) {
        drain(channelId)
      }
    }
  })()
}

/**
 * 一对一入队：超限丢弃并发内部告警消息（skipAlert 防环）
 */
export function enqueueDirectPush(
  channel: notificationChannelModel,
  payload: { title: string, content: string },
  meta: { originalTitle: string, ruleName: string },
): void {
  let queue = queues.get(channel.id)
  if (!queue) {
    queue = { tasks: [], draining: false }
    queues.set(channel.id, queue)
  }
  if (queue.tasks.length >= DIRECT_QUEUE_MAX_DEPTH) {
    logger.error('[消息中心监控告警] 一对一队列积压超限，任务丢弃', {
      channelId: channel.id,
      channelName: channel.name,
      ruleName: meta.ruleName,
      depth: queue.tasks.length,
    })
    void reportDirectError(
      '一对一任务丢弃',
      { channel, ...payload, ...meta },
      `单渠道队列积压超过 ${DIRECT_QUEUE_MAX_DEPTH} 条`,
    ).catch(() => {})
    return
  }
  queue.tasks.push({ channel, ...payload, ...meta })
  drain(channel.id)
}
