import type { taskRunInfo } from './taskRunner'
import { db } from '../../db'
import { dateToString } from '../../utils'
import { logger } from '../../utils/logger'
import { MessageCategory, MessageType } from '../type/message'
import { pushChannel } from '../channel'
import { sendMessage } from '../message'
import { parseTaskAlertChannelIds } from './alertChannel'

function buildTaskFailureContent(info: taskRunInfo) {
  return {
    title: '定时任务运行失败',
    content: [
      `任务名称：${info.task.name}`,
      `任务 ID：${info.task.id}`,
      `运行时长：${formatDuration(info.duration)}`,
      `失败时间：${dateToString(new Date(info.endTime))}`,
    ].join('\n'),
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${minutes}m ${remainSeconds}s`
}

/**
 * 任务失败通知入口：error_notify 写消息中心、error_alert 推送渠道，两个开关独立
 */
export async function notifyTaskFailure(info: taskRunInfo) {
  if (info.success)
    return
  const hasAlertChannels = parseTaskAlertChannelIds(info.task.error_alert).length > 0
  if (info.task.error_notify !== 1 && !hasAlertChannels)
    return
  if (info.task.error_notify === 1) {
    try {
      await sendMessage({
        ...buildTaskFailureContent(info),
        category: MessageCategory.CRON,
        type: MessageType.ERROR,
      })
    }
    catch (e: any) {
      logger.error(`推送定时任务运行失败通知异常 (task: ${info.task.name}):`, e.message || e)
    }
  }
  if (hasAlertChannels) {
    await alertTaskFailure(info)
  }
}

async function alertTaskFailure(info: taskRunInfo) {
  const channelIds = parseTaskAlertChannelIds(info.task.error_alert)
  if (channelIds.length === 0) {
    return
  }
  const payload = buildTaskFailureContent(info)
  try {
    const channels = await db.notificationChannel.$list({ where: { id: { in: channelIds } } })
    // allSettled 保证单渠道失败不影响其余渠道
    await Promise.allSettled(channels.map(async (channel) => {
      const result = await pushChannel(
        { type: channel.type, config: channel.config },
        payload,
        // 失败告警不排队等待即时送达，但时间戳计入窗口，批量故障时不击穿提供方限流
        { bypassThrottle: 'record' },
      )
      if (result.success) {
        return
      }
      logger.error('[定时任务告警] 渠道推送失败', {
        taskId: info.task.id,
        taskName: info.task.name,
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        error: result.error,
      })
      void sendMessage({
        title: '告警消息推送失败',
        content: `触发任务：${info.task.name}\n渠道：${channel.name}（${channel.type}）\n错误：${result.error}`,
        category: MessageCategory.SYSTEM,
        type: MessageType.ERROR,
        skipAlert: true,
      }).catch(() => {})
    }))
  }
  catch (e: any) {
    logger.error(`推送定时任务运行失败告警异常 (task: ${info.task.name}):`, e?.message || e)
  }
}
