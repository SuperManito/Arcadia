const { CronJob, CronTime } = require('cron')

const CronTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
const id2Task = {}

/**
 * 设置定时任务
 *
 * @param {string} id - 任务ID
 * @param {string} cron - cron表达式
 * @param {function} callback - 回调函数
 */
function setTask(id, cron, callback) {
  // 如果任务已存在，则先停止并删除
  if (id2Task[id]) {
    removeTask(id)
  }
  const cronTaskInstance = {}
  id2Task[id] = cronTaskInstance
  cronTaskInstance.callback = callback
  cronTaskInstance.task = new CronJob(
    cron,
    () => {
      cronTaskInstance.callback()
    },
    true,
    CronTimeZone,
  )
  cronTaskInstance.task.start()
}

/**
 * 移除定时任务
 *
 * @param {string} id - 任务ID
 */
function removeTask(id) {
  const task = id2Task[id]
  if (task) {
    task.task.stop()
    delete id2Task[id]
  }
}

/**
 * 验证定时表达式合法性
 *
 * @param {string} cronExpression - 要验证的 Cron 表达式
 * @throws {Error} 如果 Cron 表达式无效，则抛出错误
 */
function validateCronExpression(cronExpression) {
  try {
    // eslint-disable-next-line no-new
    new CronTime(cronExpression)
  }
  catch (e) {
    throw new Error(`定时规则错误：${e.message || e}`)
  }
}

module.exports = {
  setTask,
  removeTask,
  validateCronExpression,
}
