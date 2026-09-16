import type { taskRunInfo } from '../cron/taskRunner'
import { sendMessage } from './index'
import { logger } from '../../utils/logger'
import { dateToString } from '../../utils'
import { MessageCategory, MessageType } from '../type/message'

function formatDuration(ms: number): string {
  if (ms < 1000)
    return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60)
    return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${minutes}m ${remainSeconds}s`
}

export async function notifyTaskFailure(info: taskRunInfo) {
  if (info.success)
    return
  if (info.task.error_notify !== 1)
    return
  try {
    await sendMessage({
      title: '定时任务运行失败',
      content: `任务名称：${info.task.name}\n任务 ID：${info.task.id}\n执行时长：${formatDuration(info.duration)}\n失败时间：${dateToString(new Date(info.endTime))}`,
      category: MessageCategory.Cron,
      type: MessageType.Error,
    })
  }
  catch (e: any) {
    logger.error(`推送定时任务运行失败通知异常 (task: ${info.task.name}):`, e.message || e)
  }
}
