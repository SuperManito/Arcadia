const { CronJob } = require('cron')

const id2Task = {}
const CronTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'

/**
 * 设置定时任务
 * @param {string} id - 任务ID
 * @param {string} cron - cron表达式
 * @param {function} callback - 回调函数
 */
function setTask(id, cron, callback) {
  let cronTask = id2Task[id]
  // 如果任务已存在，则先停止并删除
  if (cronTask) {
    cronTask.task.stop()
    delete cronTask.task
  }
  cronTask = {}
  id2Task[id] = cronTask
  cronTask.callback = callback
  cronTask.task = new CronJob(
    cron,
    () => {
      cronTask.callback()
    },
    true,
    CronTimeZone,
  )
  cronTask.task.start()
}

/**
 * 移除定时任务
 * @param {string} id - 任务ID
 */
function removeTask(id) {
  const task = id2Task[id]
  if (task) {
    task.task.stop()
    delete id2Task[id]
  }
}

module.exports = {
  setTask,
  removeTask,
}
