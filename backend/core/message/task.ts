import type { taskRunInfo } from '../cron/taskRunner'
import {
  alertTaskFailure,
  buildTaskFailureContent,
  parseTaskAlertChannelIds,
} from '../cron/alert'
import { logger } from '../../utils/logger'
import { MessageCategory, MessageType } from '../type/message'
import { sendMessage } from './index'

/**
 * error_notify 与 error_alert 独立开关，共用同一份失败文案
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
