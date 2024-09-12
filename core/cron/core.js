const engine = require('./engine')
const eventBus = require('./eventBus').task
const db = require('../db')
const dbTaskCore = require('../db').task_core
const dbTasks = require('../db').tasks
const { APP_ROOT_DIR } = require('../type')
const { logger } = require('../logger')
const { execShell } = require('../cmd')

const runningTasks = {} // 正在运行的任务信息
const runningInstance = {} // 正在运行的任务实例（child_process）

/**
 * 任务初始化
 *
 * @description 从数据库中读取任务并初始化（应用数据库中配置的定时任务）
 */
function cronJobInit() {
  setTimeout(async () => {
    logger.log('定时任务初始化 - 开始')
    for (const task of (await dbTaskCore.findMany())) {
      const taskCoreId = task.id
      const tasksId = parseInt(taskCoreId.substring(2))
      const cronExpression = task.cron.trim()

      // 高危操作
      // 删除不存在的定时任务（处理不符合预期未被移除的非正常任务）
      if (!(await dbTasks.$getById(tasksId))) {
        await dbTaskCore.$deleteById(taskCoreId)
        // logger.warn(`定时任务 ${tasksId} 不存在，已删除`)
      }

      // 定时表达式格式校验
      const cronParams = cronExpression.split(' ')
      if (cronParams.length < 5 || cronParams.length > 6) {
        logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} (格式错误)`)
        continue
      }
      try {
        engine.validateCronExpression(cronExpression)
      } catch (error) {
        logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} (${error})`)
        continue
      }
      // 设置定时
      try {
        engine.setTask(taskCoreId, cronExpression, () => onCron(task))
        // logger.log(`设置定时任务 ${tasksId} 成功 => ${cronExpression}`)
      } catch (e) {
        logger.error(`设置定时任务 ${tasksId} 失败 => ${cronExpression} ${e.message || e}`)
      }
    }
    // 应用未正常设置的定时任务
    const ids = (await dbTaskCore.findMany()).map((task) => task.id.substring(2))
    for (const task of (await dbTasks.findMany())) {
      if (ids.includes(String(task.id))) {
        continue
      }
      await applyCron(task.id)
    }
    // logger.log('任务总数', taskCoreCurd.list().length)
    logger.log('定时任务初始化 - 结束')
  }, 1000)
}

/**
 * 定时任务回调
 *
 * @param {{id: string, cron: string, callback: string}} task
 */
function onCron(task) {
  if (task.id.startsWith('T_') && task.callback === '') {
    onCronMain(parseInt(task.id.substring(2)))
      .then((_r) => {
        // console.log("over", r)
      })
  }
  eventBus.emit(task.id, task)
  eventBus.emit(`callback.${task.callback}`, task)
}

/**
 * 定时任务回调内容
 *
 * @param {number} taskId
 */
async function onCronMain(taskId) {
  const task = await dbTasks.$getById(taskId)
  // 删除不存在的定时任务
  if (!task) {
    await dbTaskCore.$deleteById(`T_${taskId}`)
    return
  }
  // logger.log('触发定时任务', task.shell)
  // 跳过禁用的任务
  if (task.active <= 0) {
    // logger.log("触发定时任务", task.shell, "（PASS，原因：已被禁用）")
    return
  }
  // 解析高级配置
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
  } catch {}
  // 跳过正在运行的任务（运行并发时除外）
  if (runningTasks[taskId] && !allow_concurrency) {
    // logger.log('触发定时任务', task.shell, '（PASS，原因：正在运行）')
    return
  }
  // 补齐命令
  if (before_task_shell) {
    task.shell = `bash -c "cd ${APP_ROOT_DIR} ; ${before_task_shell}" ; ${task.shell}`
  }
  if (after_task_shell) {
    task.shell = `${task.shell} ; bash -c "cd ${APP_ROOT_DIR} ; ${after_task_shell}"`
  }

  runningTasks[taskId] = task // 将任务添加到正在运行的列表
  runningInstance[taskId] = runCronTaskShell(task)
  return runningInstance[taskId]
}

/**
 * 执行定时任务的命令
 *
 * @param {object} task - 任务对象
 * @returns {Promise<void>}
 */
function runCronTaskShell(task) {
  const date = new Date()
  return execShell(task.shell, {
    callback: (error, stdout, _stderr) => {
      // if (stdout) {
      //   logger.debug(`#${taskId}:`, stdout)
      // }
      // 任务回调
      if (error) {
        // logger.log("定时任务运行完毕", task.shell, stdout.substring(stdout.length - 1000))
        // } else {
        logger.warn('定时任务异常', task.shell, '➜', error.toString().substring(stdout.length - 1000))
      }
    },
    onExit: (_code) => {
      // logger.log(`定时任务 ${taskId} 运行完毕`)
      delete runningTasks[task.id]
      delete runningInstance[task.id]
      // 更新最后运行时间和其运行时长
      dbTasks.update({ where: { id: task.id },
        data: {
          last_runtime: date,
          last_run_use: (new Date().getTime() - date.getTime()) / 1000,
        },
      }).catch((_e) => {})
    },
  })
}

/**
 * 主动执行任务（接口封装）
 *
 * @param {number} taskId
*/
async function runTask(taskId) {
  const task = await dbTasks.$getById(taskId)
  // 删除不存在的定时任务
  if (!task) {
    throw new Error('任务不存在')
  }
  // logger.log('主动执行任务', task.shell)
  // 跳过正在运行的任务
  if (runningTasks[taskId]) {
    throw new Error('任务正在运行')
  }
  // 解析高级配置
  let before_task_shell = ''
  let after_task_shell = ''
  try {
    const config = JSON.parse(task.config)
    if (typeof config.before_task_shell === 'string') {
      before_task_shell = config.before_task_shell
    }
    if (typeof config.after_task_shell === 'string') {
      after_task_shell = config.after_task_shell
    }
  } catch {}
  // 补齐命令
  if (before_task_shell) {
    task.shell = `bash -c "cd ${APP_ROOT_DIR} ; ${before_task_shell}" ; ${task.shell}`
  }
  if (after_task_shell) {
    task.shell = `${task.shell} ; bash -c "cd ${APP_ROOT_DIR} ; ${after_task_shell}"`
  }

  runningTasks[taskId] = task // 将任务添加到正在运行的列表
  runningInstance[taskId] = runCronTaskShell(task)
}

/**
 * 终止运行中的任务（接口封装）
 *
 * @param {number} taskId
*/
function terminateTask(taskId) {
  const task = runningInstance[taskId]
  if (task) {
    let isExited = false
    let elapsedTime = 0

    task.kill('SIGTERM')
    task.once('exit', (_code, signal) => {
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        delete runningInstance[taskId]
        isExited = true
        // logger.log(`定时任务 ${taskId} 已被终止`);
      }
    })
    const checkInterval = setInterval(() => {
      elapsedTime += 1000
      if (isExited || elapsedTime >= 30000) {
        clearInterval(checkInterval) // 清除定时器（已终止或超时）
      } else if (runningInstance[taskId]) {
        task.kill('SIGKILL') // 强制终止
        // logger.log(`定时任务 ${taskId} 已被强制终止`);
      }
    }, 1000) // 每秒检查一次
  }
}

/**
 * 应用定时任务
 *
 * @param {number|number[]} taskId
 * @description 数据库设计了两个表，tasks表只存储用户数据，task_core表关联定时任务
 */
async function applyCron(taskId) {
  let ids = []
  if (Array.isArray(taskId)) {
    ids = taskId
  } else {
    ids.push(taskId)
  }
  for (let id of ids) {
    id = parseInt(id)
    const task = await dbTasks.$getById(id)
    if (task) {
      await setTaskCore(`T_${task.id}`, task.cron.trim(), '')
    } else {
      const taskId = `T_${id}`
      await dbTaskCore.$deleteById(taskId)
      engine.removeTask(taskId)
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
async function setTaskCore(id, cron, callback) {
  await dbTaskCore.$upsertById({ id, cron, callback })
  engine.setTask(id, cron, () => onCron({ id, cron, callback: '' }))
}

/**
 * 查询bind组（标签列表）
 */
async function getBindGroup() {
  return await db.$queryRaw`
    SELECT bind, COUNT(*) AS count
    FROM (
      SELECT SUBSTR(
        bind, 
        INSTR(bind, '#') + 1,
        INSTR(SUBSTR(bind, INSTR(bind, '#') + 1), '#') - 1
      ) AS bind
      FROM tasks
    )
    GROUP BY bind
  `
}

/**
 * 数据库所有成员sort设置为顺序值
 */
async function fixOrder() {
  await db.$executeRaw`
          UPDATE tasks
          SET sort = t.row_num
          FROM (SELECT id, row_number() over (PARTITION BY type order by sort) as row_num
                FROM tasks) t
          WHERE t.id = tasks.id`
}

/**
 * 将指定记录的sort值更新为新的值
 */
async function updateSortById(taskId, newOrder) {
  const oldRecord = await dbTasks.$getById(taskId)
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

module.exports = {
  cronJobInit,
  runningTasks,
  runTask,
  terminateTask,
  applyCron,
  getBindGroup,
  fixOrder,
  updateSortById,
}
