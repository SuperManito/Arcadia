import type { TaskInstance } from './type'
import { removeTask, setTask, validateCronExpression } from './engine'
import db from '../../db'
import { logger } from '../../utils/logger'
import { getLatestRunningInstance, liveLogRegistered, runCronTask } from './taskRunner'
import { makeSocketRunCallbacks } from '../executor'
import { registerCleanupCron } from './cleanup'

export { getAllRunningInstances, isTaskRunning, runCronTask, stopCronTask } from './taskRunner'

/**
 * 注册实时日志事件
 */
export function registerLiveLogEvent(taskId: number) {
  try {
    const latest = getLatestRunningInstance(taskId)
    if (!latest) {
      return { running: false, runId: '' }
    }
    const { runId, child } = latest
    if (!child) {
      return { running: false, runId: '' }
    }
    if (!liveLogRegistered.has(runId)) {
      liveLogRegistered.add(runId)
      const callbacks = makeSocketRunCallbacks()
      child.stdout?.on('data', (data: { toString: () => string }) => {
        callbacks.onStdout(runId, data.toString())
      })
      child.stderr?.on('data', (data: { toString: () => string }) => {
        callbacks.onStderr(runId, data.toString())
      })
      child.once('close', () => {
        liveLogRegistered.delete(runId)
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
  for (const task of (await db.taskCore.$list())) {
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
      // logger.info(`设置定时任务 ${tasksId} 成功 => ${cronExpression}`)
    }
    catch (e: any) {
      logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} ${e.message || e}`)
    }
  }
  // 应用未正常设置的定时任务
  const ids = (await db.taskCore.$list()).map((task) => task.id.substring(2))
  for (const task of (await db.tasks.$list())) {
    if (ids.includes(String(task.id))) {
      continue
    }
    await applyCron(task.id)
  }

  // 初始化定时清理任务（配置驱动，独立于 tasks/taskCore）
  await registerCleanupCron()

  // logger.info('任务总数', taskCoreCurd.list().length)
  logger.info('定时任务初始化完成')
}
/**
 * 定时任务回调
 */
function onCron(task: TaskInstance) {
  if (task.id.startsWith('T_') && task.callback === '') {
    runCronTask(Number.parseInt(task.id.substring(2)))
      .catch((e) => logger.error(`定时任务 ${task.id} 触发异常`, e))
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
    if (Number.isNaN(id)) {
      continue
    }
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
