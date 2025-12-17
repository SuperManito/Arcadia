import { CronJob, validateCronExpression as cronValidateCronExpression } from 'cron'
import type { TaskInstance } from './type'

const CronTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'

const id2Task: { [key: string]: TaskInstance } = {}

/**
 * 设置定时任务
 *
 * @param {string} id - 任务ID
 * @param {string} cron - 定时表达式
 * @param {function} callback - 回调函数
 */
export function setTask(id: string, cron: string, callback: () => void) {
  // 如果任务已存在，则先停止并删除
  if (id2Task[id]) {
    removeTask(id)
  }
  const cronTaskInstance: TaskInstance = {} as any
  id2Task[id] = cronTaskInstance
  cronTaskInstance.callback = callback
  cronTaskInstance.job = new CronJob(
    cron,
    () => {
      if (typeof cronTaskInstance.callback === 'function') {
        cronTaskInstance.callback()
      }
    },
    null, // onComplete
    true, // start
    CronTimeZone, // timeZone
  )
  cronTaskInstance.job.start() // 二次启用（保险）
}

/**
 * 移除定时任务
 *
 * @param {string} id - 任务ID
 */
export function removeTask(id: string) {
  const task = id2Task[id]
  if (task && task.job) {
    task.job.stop()
    delete id2Task[id]
  }
}

/**
 * 验证定时表达式合法性
 *
 * @param {string} cronExpression - 要验证的 Cron 表达式
 * @throws {Error} 如果 Cron 表达式无效，则抛出错误
 */
export function validateCronExpression(cronExpression: string) {
  const validation = cronValidateCronExpression(cronExpression)
  if (!validation.valid) {
    throw new Error(validation.error ? `定时规则错误：${validation.error.message || validation.error}` : '定时规则错误')
  }
}
