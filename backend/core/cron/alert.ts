import type { taskRunInfo } from './taskRunner'
import { db } from '../../db'
import { dateToString } from '../../utils'
import { logger } from '../../utils/logger'
import { pushChannel } from '../channel'

/**
 * 运行失败通知与告警共用文案
 */
export function buildTaskFailureContent(info: taskRunInfo) {
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

export function parseTaskAlertChannelIds(value: string | null | undefined): number[] {
  if (!value) {
    return []
  }
  const ids = value
    .split(',')
    .map(item => item.trim())
    .filter(item => /^\d+$/.test(item))
    .map(item => Number.parseInt(item, 10))
    .filter(id => Number.isSafeInteger(id) && id > 0)
  return [...new Set(ids)]
}

export function normalizeTaskAlertChannelIds(value: unknown): string {
  if (Array.isArray(value)) {
    return parseTaskAlertChannelIds(value.join(',')).join(',')
  }
  if (typeof value === 'string') {
    return parseTaskAlertChannelIds(value).join(',')
  }
  return ''
}

export async function countTasksByAlertChannel(channelId: number): Promise<number> {
  const tasks = await db.tasks.findMany({
    where: { error_alert: { contains: String(channelId) } },
    select: { error_alert: true },
  })
  return tasks.filter(task => parseTaskAlertChannelIds(task.error_alert).includes(channelId)).length
}

export async function alertTaskFailure(info: taskRunInfo) {
  const channelIds = parseTaskAlertChannelIds(info.task.error_alert)
  if (channelIds.length === 0) {
    return
  }
  const payload = buildTaskFailureContent(info)
  try {
    const channels = await db.notificationChannel.findMany({ where: { id: { in: channelIds } } })
    // allSettled 保证单渠道失败不影响其余渠道
    await Promise.allSettled(channels.map(async (channel) => {
      const result = await pushChannel(
        { type: channel.type, config: channel.config },
        payload,
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
    }))
  }
  catch (e: any) {
    logger.error(`推送定时任务运行失败告警异常 (task: ${info.task.name}):`, e?.message || e)
  }
}
