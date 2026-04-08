import { removeTask, setTask, validateCronExpression } from './engine'
import type { tasksModel } from '../../db'
import db from '../../db'
import type { TaskInstance } from './type'
import { logger } from '../../utils/logger'
import { addAfterTaskRun, addBeforeTaskRun, liveLogRegistered, runCronTask, runningTasks, runningTasksInsts } from './taskRunner'
import { makeSocketRunCallbacks } from '../runner'
import { APP_ROOT_DIR } from '../type'

export { runCronTask, runningTasks, stopCronTask } from './taskRunner'

/**
 * 注册实时日志事件
 */
export function registerLiveLogEvent(taskId: number) {
  try {
    const child = runningTasksInsts[taskId]
    if (!child) {
      return { running: false, runId: '' }
    }
    const runId = `tasks_${taskId}`
    if (!liveLogRegistered.has(taskId)) {
      liveLogRegistered.add(taskId)
      const callbacks = makeSocketRunCallbacks()
      child.stdout?.on('data', (data: { toString: () => string }) => {
        callbacks.onStdout(runId, data.toString())
      })
      child.stderr?.on('data', (data: { toString: () => string }) => {
        callbacks.onStderr(runId, data.toString())
      })
      child.once('exit', () => {
        liveLogRegistered.delete(taskId)
        callbacks.onExit(runId)
      })
    }
    return { running: true, runId }
  }
  catch {
    return { running: false, runId: '' }
  }
}

/**
 * 任务初始化
 *
 * @description 从数据库中读取任务并初始化（应用数据库中配置的定时任务）
 */
export async function initCronJob() {
  for (const task of (await db.taskCore.findMany())) {
    const taskCoreId = task.id
    const tasksId = Number.parseInt(taskCoreId.substring(2))
    const cronExpression = task.cron.trim()

    // 高危操作
    // 删除不存在的定时任务（处理不符合预期未被移除的非正常任务）
    if (!(await db.tasks.$getById(tasksId))) {
      await db.taskCore.$deleteById(taskCoreId)
      // logger.warn(`定时任务 ${tasksId} 不存在，已删除`)
    }

    // 定时表达式格式校验
    const cronParams = cronExpression.split(' ')
    if (cronParams.length < 5 || cronParams.length > 6) {
      logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} (格式错误)`)
      continue
    }
    try {
      validateCronExpression(cronExpression)
    }
    catch (error: any) {
      logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} (${error})`)
      continue
    }
    // 设置定时
    try {
      setTask(taskCoreId, cronExpression, () => onCron(task))
      // logger.log(`设置定时任务 ${tasksId} 成功 => ${cronExpression}`)
    }
    catch (e: any) {
      logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} ${e.message || e}`)
    }
  }
  // 应用未正常设置的定时任务
  const ids = (await db.taskCore.findMany()).map((task) => task.id.substring(2))
  for (const task of (await db.tasks.findMany())) {
    if (ids.includes(String(task.id))) {
      continue
    }
    await applyCron(task.id)
  }
  // logger.log('任务总数', taskCoreCurd.list().length)
  logger.log('定时任务初始化完毕')
}
/**
 * 定时任务回调
 */
function onCron(task: TaskInstance) {
  if (task.id.startsWith('T_') && task.callback === '') {
    runCronTask(Number.parseInt(task.id.substring(2)))
      .then((_r) => {
        // console.log("over", r)
      })
  }
  if (typeof task.callback === 'function') {
    task.callback()
  }
}
/**
 * 应用定时任务
 *
 * @param {number|number[]} taskId
 * @description 数据库设计了两个表，tasks表只存储用户数据，taskCore表关联定时任务
 */
export async function applyCron(taskId: number | string | (number | string)[]) {
  let ids: (number | string)[] = []
  if (Array.isArray(taskId)) {
    ids = taskId
  }
  else {
    ids.push(taskId)
  }
  for (let id of ids) {
    id = Number.parseInt(id as unknown as string)
    const task = await db.tasks.$getById(id)
    if (task) {
      await setTaskCore(`T_${task.id}`, task.cron.trim(), '')
    }
    else {
      const taskId = `T_${id}`
      await db.taskCore.$deleteById(taskId)
      removeTask(taskId)
    }
  }
}

/**
 * 设置定时任务
 *
 * @param {string} id
 * @param {string} cron
 * @param {string} callback
 */
async function setTaskCore(id: string, cron: string, callback: string) {
  await db.taskCore.$upsertById({ id, cron, callback })
  const taskData: TaskInstance = { id, cron, callback }
  setTask(id, cron, () => onCron(taskData))
}

/**
 * 查询bind组（标签列表）
 */
export async function getBindGroup() {
  return await db.$queryRaw`SELECT bind, COUNT(*) AS count
                            FROM (
                              SELECT SUBSTR(
                                bind, 
                                INSTR(bind, '#') + 1,
                                INSTR(SUBSTR(bind, INSTR(bind, '#') + 1), '#') - 1
                              ) AS bind
                              FROM tasks
                            )
                            GROUP BY bind`
}

/**
 * 数据库所有成员sort设置为顺序值
 */
export async function fixOrder() {
  await db.$executeRaw`UPDATE tasks
                       SET sort = t.row_num
                       FROM (SELECT id, row_number() over (PARTITION BY type order by sort) as row_num
                             FROM tasks) t
                       WHERE t.id = tasks.id`
}

/**
 * 将指定记录的sort值更新为新的值
 */
export async function updateSortById(taskId: number, newOrder: number) {
  const oldRecord = await db.tasks.$getById(taskId)
  if (!oldRecord) {
    return false
  }
  if (newOrder === oldRecord.sort) {
    return true
  }
  const args = newOrder > oldRecord.sort
    ? [oldRecord.sort, newOrder, -1, oldRecord.sort + 1, newOrder, oldRecord.type]
    : [oldRecord.sort, newOrder, 1, newOrder, oldRecord.sort - 1, oldRecord.type]
  await db.$executeRaw`BEGIN TRANSACTION;`
  if (newOrder > oldRecord.sort) {
    await db.$executeRaw`UPDATE tasks
                         SET sort = sort + ${args[2]}
                         WHERE sort > ${oldRecord.sort} AND sort <= ${newOrder} AND type = ${args[5]}`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE tasks
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder} AND sort < ${oldRecord.sort} AND type = ${args[5]}`
  }
  await db.$executeRaw`UPDATE tasks
                       SET sort = ${newOrder}
                       WHERE id = ${taskId}`
  await db.$executeRaw`COMMIT;`
  return true
}
;(() => {
  addBeforeTaskRun((task) => {
    // 解析高级配置
    if (task.config) {
      let before_task_shell = ''
      let after_task_shell = ''
      let allow_concurrency = false
      try {
        const config = JSON.parse(task.config)
        if (typeof config.before_task_shell === 'string') {
          before_task_shell = config.before_task_shell
        }
        if (typeof config.after_task_shell === 'string') {
          after_task_shell = config.after_task_shell
        }
        if (typeof config.allow_concurrency === 'boolean') {
          allow_concurrency = config.allow_concurrency
        }
      }
      catch {}
      // 跳过正在运行的任务（运行并发时除外）
      if (runningTasks[task.id] && !allow_concurrency) {
        // logger.log('触发定时任务', task.shell, '（PASS，原因：正在运行）')
        return
      }
      if (before_task_shell) {
        task.shell = `${before_task_shell}" ; ${task.shell}`
      }
      if (after_task_shell) {
        task.shell = `${task.shell} ; bash -c "cd ${APP_ROOT_DIR} ; ${after_task_shell}"`
      }
    }
  })
  addAfterTaskRun((info) => {
    const task = info.task
    let allow_concurrency = false // 是否允许并发
    if (task.config) {
      try {
        const config = JSON.parse(task.config)
        if (typeof config.allow_concurrency === 'boolean') {
          allow_concurrency = config.allow_concurrency
        }
      }
      catch {}
    }
    const startTime = info.startTime
    const duration = info.duration
    const data = { last_runtime: new Date(startTime), last_run_use: duration / 1000 }
    // 允许并发后存在任务重叠的情况，需要具体判断
    if (allow_concurrency) {
      db.tasks.$getById(task.id).then((task: tasksModel) => {
        // 如果记录的最后时间比当前时间早，则更新
        if (task.last_runtime && task.last_runtime.getTime() <= startTime) {
          // 从正在运行的任务中删除
          delete runningTasks[task.id]
          delete runningTasksInsts[task.id]
          // 更新最后运行时间和其运行时长
          db.tasks.update({ where: { id: task.id }, data }).catch((_e) => {})
        }
      }).catch((_e) => {})
    }
    else {
      // 从正在运行的任务中删除
      delete runningTasks[task.id]
      delete runningTasksInsts[task.id]
      // 更新最后运行时间和其运行时长
      db.tasks.update({ where: { id: task.id }, data }).catch((_e) => {})
    }
  })
})()
