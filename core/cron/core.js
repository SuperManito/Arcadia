const engine = require('./engine')
const eventBus = require('./eventBus').task
const db = require('../db')
const dbTaskCore = require('../db').task_core
const dbTasks = require('../db').tasks
const { rootPath } = require('../file')
const { logger } = require('../logger')
const { exec } = require('child_process')

const runningTask = {} // 正在运行的任务信息
const runningInstance = {} // 正在运行的任务实例（child_process）

/**
 * 将定时字符串中的月份减一
 *
 * @param {string} cron 定时字符串
 * @returns {string} 减一后的定时字符串
 */
// function decreaseMonth (cron) {
//   const parts = cron.split(' ')
//   let month = parts.length === 6 ? parts[4] : parts[3]
//   if (month === '*') {
//     // 如果月份为 *，则直接返回原字符串
//     return cron
//   }
//   if (/\d/.test(month)) {
//     // 如果月份包含数字，则将数字减一
//     month = month
//       .split(',')
//       .map((m) => {
//         if (m.includes('-')) {
//           // 如果月份是区间表达式，则将区间的两个数字都减一
//           const [start, end] = m.split('-')
//           return `${Math.max(Number(start) - 1, 0)}-${Math.max(Number(end) - 1, 0)}`
//         } else {
//           // 如果月份是单一数字，则将数字减一
//           return String(Math.max(Number(m) - 1, 0))
//         }
//       })
//       .join(',')
//     if (parts.length === 6) {
//       parts[4] = month
//     } else {
//       parts[3] = month
//     }
//   }
//   return parts.join(' ')
// }

/**
 * 任务初始化
 */
function cronInit() {
  setTimeout(async () => {
    const tasks = await dbTaskCore.findMany()
    logger.log('定时任务初始化 - 开始')
    for (const task of tasks) {
      const taskCoreId = task.id
      const taskId = taskCoreId.split('T_')[1]
      task.cron = task.cron.trim() // 去除首尾空格
      // 定时表达式格式校验
      const cronParams = task.cron.split(' ')
      if (cronParams.length < 5 || cronParams.length > 6) {
        logger.error(`设置定时任务 ${taskId} 失败 => ${task.cron.trim()} (格式错误)`)
        continue
      }
      // 删除不存在的定时任务
      if (!(await dbTaskCore.$getById(taskCoreId))) {
        await dbTasks.delete({
          where: {
            id: taskId,
          },
        })
        // logger.warn(`定时任务 ${taskId} 不存在，已删除`)
      }
      // 设置定时
      try {
        engine.setTask(taskCoreId, task.cron, () => onCron(task))
        // logger.log(`设置定时任务 ${taskId} 成功 => ${task.cron}`)
      } catch (e) {
        logger.error(`设置定时任务 ${taskId} 失败 => ${task.cron.trim()} ${e.message || e}`)
      }
    }
    const ids = tasks.map((t) => t.id.split('T_')[1])
    const tasks1 = await dbTasks.findMany()
    for (const task of tasks1) {
      if (ids.includes(String(task.id))) {
        continue
      }
      await module.exports.fixCron(task.id)
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
    onCronTask(parseInt(task.id.substring(2)))
      .then((_r) => {
        // console.log("over", r)
      })
  }
  eventBus.emit(task.id, task)
  eventBus.emit(`callback.${task.callback}`, task)
}

/**
 * 主动执行任务
 *
 * @param {number} taskId
*/
async function runTask(taskId) {
  const task = await dbTasks.$getById(taskId)
  if (!task) {
    logger.error(`任务 ${taskId} 不存在`)
    throw new Error('任务不存在')
  }
  if (runningTask[taskId]) {
    logger.error(`任务 ${taskId} 正在运行`)
    throw new Error('任务正在运行')
  }
  logger.log('主动执行任务', task.shell)
  runningTask[taskId] = task // 将任务添加到正在运行的列表
  const date = new Date()
  runningInstance[taskId] = taskRunner(task.shell, {
    callback: (error, stdout, _stderr) => {
      if (error) {
        logger.warn('任务异常', task.shell, '➜', error.toString().substring(stdout.length - 1000))
      }
    },
    onExit: (_code) => {
      delete runningTask[taskId]
      delete runningInstance[taskId]
      dbTasks.update({
        where: {
          id: taskId,
        },
        data: {
          last_runtime: date,
          last_run_use: (new Date().getTime() - date.getTime()) / 1000,
        },
      }).catch((_e) => {})
    },
  })
}

/**
 * 添加一个新的函数来停止任务
 *
 * @param {number} taskId
*/
function stopTask(taskId) {
  const task = runningInstance[taskId]
  if (task) {
    task.kill()
    delete runningInstance[taskId]
    logger.log(`定时任务 ${taskId} 已被终止`)
  }
}

/**
 * 执行shell
 *
 * @param {string} shell
 * @param {{
 * callback:(error:any,stdout:string,stderr:string)=>?,
 * onChange:function(data:{},type:'stdout'|'stderr')?,
 * onExit:function(code:number)?,
 * onException:function(error)?
 * }?} config
 * @return child_process.ChildProcess
 */
function taskRunner(shell, config) {
  try {
    // 执行定时任务命令
    // logger.log("触发定时任务", shell)
    const process = exec(`cd ${rootPath}; ${shell}`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10, // 10M
    }, config.callback)
    if (config.onExit) {
      process.on('exit', config.onExit)
    }
    const onChange = config.onChange
    if (onChange) {
      process.stdout.on('data', (data) => onChange(data, 'stdout'))
      process.stderr.on('data', (data) => onChange(data, 'stderr'))
    }
    return process
  } catch (e) {
    try {
      config.onException && config.onException(e)
    } finally {
      config.onExit && config.onExit(1)
    }
  }
}

/**
 * tasks表回调
 *
 * @param {number} taskId
 */
async function onCronTask(taskId) {
  const task = await dbTasks.$getById(taskId)
  if (!task) {
    // 删除不存在的定时任务
    await dbTaskCore.$deleteById(`T_${taskId}`)
    return
  }
  if (task.active <= 0) {
    // logger.log("触发定时任务", task.shell, "（PASS，原因：已被禁用）")
    return
  }
  if (runningTask[taskId]) {
    // logger.log('触发定时任务', task.shell, '（PASS，原因：正在运行）')
    return
  }
  logger.log('触发定时任务', task.shell)
  runningTask[taskId] = task // 将任务添加到正在运行的列表
  const date = new Date()
  runningInstance[taskId] = taskRunner(task.shell, {
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
      // 任务结束后的回调
      // logger.log(`定时任务 ${taskId} 运行完毕`)
      delete runningTask[taskId]
      delete runningInstance[taskId]
      // 更新数据库对应任务的最后运行时间和其运行时长
      dbTasks.update({
        where: {
          id: taskId,
        },
        data: {
          last_runtime: date,
          last_run_use: (new Date().getTime() - date.getTime()) / 1000,
        },
      }).catch((_e) => {})
    },
  })
  return runningInstance[taskId]
}

/**
 * 设置定时任务
 *
 * @param {string} id
 * @param {string} cron
 * @param {string} callback
 */
async function setTaskCore(id, cron, callback) {
  const formatCron = cron.trim() // 去除首尾空格
  await dbTaskCore.$upsertById({ id, cron: formatCron, callback })
  engine.setTask(id, formatCron, () => onCron({
    id,
    cron: formatCron,
    callback: '',
  }))
}

async function setTaskJob(task) {
  return setTaskCore(`T_${task.id}`, task.cron, '')
}

/**
 * 删除定时任务
 *
 * @param {number} taskId
 */
async function deleteTaskJob(taskId) {
  const id = `T_${taskId}`
  await dbTaskCore.$deleteById(id)
  engine.removeTask(id)
}

module.exports = {
  cronInit,
  runTask,
  stopTask,
  runningTask,
  /**
   * 设置定时任务
   *
   * @param {number|number[]} taskId
   */
  fixCron: async (taskId) => {
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
        await setTaskJob(task)
      } else {
        await deleteTaskJob(id)
      }
    }
  },
  /**
   * 数据库所有成员sort设置为顺序值
   */
  fixOrder: async () => {
    await db.$executeRaw`
          UPDATE tasks
          SET sort = t.row_num
          FROM (SELECT id, row_number() over (PARTITION BY type order by sort) as row_num
                FROM tasks) t
          WHERE t.id = tasks.id`
  },
  /**
   * 将指定记录的sort值更新为新的值
   */
  updateSortById: async (taskId, newOrder) => {
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
  },
}
