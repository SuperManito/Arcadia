const express = require('express')
const api = express()
const innerCornApi = express()
const { API_STATUS_CODE } = require('../core/http')
const { logger } = require('../core/logger')

const cron = require('cron')
const core = require('../core/cron/core')
const db = require('../core/db')
const dbTasks = require('../core/db').tasks
const scriptResolve = require('../core/file/scriptResolve')
const { DIR_KEY } = require('../core/file')

/**
 * 获取定时任务列表
 */
api.get('/', async (request, response) => {
  try {
    const active = request.query.active ? request.query.active.split(',') : []
    const tags = request.query.tags ? request.query.tags.split(',').map((s) => s.trim()).filter((s) => s) : []
    const filter = Object.assign({}, request.query)
    delete filter.active
    delete filter.tags
    delete filter.orderBy
    delete filter.order
    const where = filter
    const or = []
    // 标签过滤（任务名称 bindGroup）
    if (tags.length > 0) {
      tags.forEach((tag) => {
        or.push({ tags: { contains: tag } })
      })
    }
    // 启用/禁用状态过滤
    if (active.length > 0) {
      active.forEach((active) => {
        or.push({ active: { equals: parseInt(active) } })
      })
    }
    // 搜索过滤
    if (request.query.search) {
      where.AND = {
        OR: [
          { name: { contains: request.query.search } },
          { shell: { contains: request.query.search } },
        ],
      }
    }
    if (or.length > 0) {
      where.OR = or
    }
    for (const fieldsKey in dbTasks.fields) {
      if (where[fieldsKey]) {
        where[fieldsKey] = { contains: where[fieldsKey] }
      }
    }
    // 排序
    const orderBy = request.query.orderBy || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const tasks = await dbTasks.$page({
      where,
      orderBy: [
        { [orderBy]: desc ? 'desc' : 'asc' },
      ],
      page: request.query.page,
      size: request.query.size,
    })
    // 创建时间
    // eslint-disable-next-line no-return-assign
    tasks.data.forEach((task) => task.create_time = new Date(task.create_time))
    // 上次运行时间
    tasks.data.forEach((task) => {
      if (task.last_runtime) {
        task.last_runtime = new Date(task.last_runtime)
      }
    })
    // 当前运行状态
    tasks.data.forEach((task) => (task.isRunning = !!core.runningTask[task.id]))
    // 日志路径（临时）
    tasks.data.forEach((task) => {
      task.logPath = ''
      if (task.bind && task.bind.startsWith('system#') && task.last_runtime) {
        try {
          const targetDir = task.bind.split('#')[1]
          const targetFile = task.bind.split('#')[2]
          task.logPath = `/${DIR_KEY.ROOT}${DIR_KEY.LOG}${targetDir}_${targetFile.split('\.')[0]}`
        } catch (e) {
          task.logPath = ''
        }
      }
    })
    // 代码文件（临时）
    tasks.data.forEach((task) => {
      task.scriptPath = ''
      if (task.bind && task.bind.startsWith('system#')) {
        try {
          const targetDir = task.bind.split('#')[1]
          const targetFile = task.bind.split('#')[2]
          task.scriptPath = `/${DIR_KEY.ROOT}${targetDir === 'raw' ? DIR_KEY.RAW : `${DIR_KEY.REPO + targetDir}/`}${targetFile}`
        } catch (e) {
          task.scriptPath = ''
        }
      }
    })
    response.send(API_STATUS_CODE.okData(tasks))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 创建定时任务
 */
api.post('/', async (request, response) => {
  const task = Object.assign({}, request.body, { create_time: new Date() })
  delete task.id
  try {
    try {
      // eslint-disable-next-line no-new
      new cron.CronTime(task.cron)
    } catch (e) {
      throw new Error(`定时规则错误：${e.message || e}`)
    }
    const createResult = await dbTasks.$create(task)
    logger.info('添加定时任务', task)
    await core.fixOrder()
    await core.fixCron(createResult.id)
    response.send(API_STATUS_CODE.okData(task))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改
 */
api.put('/', async (request, response) => {
  let tasks
  if (Array.isArray(request.body)) {
    tasks = request.body.map((task) => Object.assign({}, task))
  } else {
    tasks = [Object.assign({}, request.body)]
  }
  for (const task of tasks) {
    delete task.orderBy
    delete task.bind
    delete task.create_time
    if (task.cron) {
      try {
        // eslint-disable-next-line no-new
        new cron.CronTime(task.cron)
      } catch (e) {
        return response.send(API_STATUS_CODE.fail(`定时规则错误：${e.message || e}`))
      }
    }
  }
  try {
    let ok = false
    for (const task of tasks) {
      const originTask = await dbTasks.$getById(task.id)
      await dbTasks.update({ data: task, where: { id: task.id } })
      logger.info('修改定时任务', JSON.stringify(task))
      // 定时规则变更，重新加载定时任务
      if (task && task.cron && originTask.cron !== task.cron) {
        await core.fixCron(task.id)
      }
      if (!ok) {
        ok = !!task
      }
    }
    response.send(API_STATUS_CODE.okData(ok))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 调整排序
 */
api.put('/order', async (request, response) => {
  try {
    const id = request.body.id
    let order = request.body.order
    if (!id || (!order && !request.body.moveToEnd)) {
      return response.send(API_STATUS_CODE.fail('请提供完整参数'))
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await dbTasks.$page({
        orderBy: [
          { sort: 'desc' },
        ],
        page: 1,
        size: 1,
      })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
      }
    }
    await core.fixOrder()
    response.send(API_STATUS_CODE.okData(await core.updateSortById(id, order)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除
 */
api.delete('/', async (request, response) => {
  const id = request.body.id
  let ids
  try {
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    const res = await dbTasks.$deleteById(ids)
    logger.info('删除定时任务', ids.join(','))
    await core.fixOrder()
    await core.fixCron(ids)
    response.send(API_STATUS_CODE.okData(res))
  } catch (e) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 查询bind组
 */
api.get('/bindGroup', async (request, response) => {
  try {
    response.send(
      API_STATUS_CODE.okData(
        await db.$queryRaw`
                    select bind, count(*) count
                    from (SELECT SUBSTR(bind, INSTR(bind, '#') + 1,
                                        INSTR(SUBSTR(bind, INSTR(bind, '#') + 1), '#') - 1
                                 ) AS bind
                          FROM tasks)
                    GROUP BY bind`,
      ),
    )
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 查询正在运行中的任务
 */
api.get('/runningTask', async (request, response) => {
  try {
    const runningTasks = Object.values(core.runningTask)
    response.send(API_STATUS_CODE.okData(runningTasks))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 主动运行任务
 */
api.post('/run', async (request, response) => {
  const id = request.body.id
  try {
    core.runTask(id)
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 终止正在运行的任务
 */
api.post('/stopRun', async (request, response) => {
  const id = request.body.id
  let ids
  try {
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    for (const id of ids) {
      core.stopTask(id)
    }
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 批量更新定时任务（底层专用）
 */
innerCornApi.post('/updateAll', async (request, response) => {
  function toBind(type, s) {
    let prefix = `/${DIR_KEY.ROOT}${DIR_KEY.REPO}`
    if (s.startsWith(prefix)) {
      s = s.replace(prefix, '')
    }
    prefix = `/${DIR_KEY.ROOT}${DIR_KEY.RAW}`
    if (s.startsWith(prefix)) {
      s = s.replace(prefix, DIR_KEY.RAW)
    }
    return `${type}#${s.substring(0, s.indexOf('/'))}#${s.substring(s.indexOf('/') + 1)}`
  }
  try {
    const infos = []
    const { deleteFiles, newFiles, type } = request.body

    // 删除
    if (deleteFiles && deleteFiles.length > 0) {
      const deleteTask = await dbTasks.$list({
        type: 'system',
        bind: { in: newFiles.map((s) => toBind(type, s.path)) },
      })
      const deleteIds = deleteTask.map((s) => s.id)
      await dbTasks.$deleteById(deleteIds)
      for (const item of deleteTask) {
        const paths = item.bind.split('#')
        const path = `${paths[1]}/${paths[2]}`
        try {
          infos.push({
            success: true,
            type: 1,
            path,
            name: item.name,
            remark: item.remark,
            message: 'ok',
          })
        } catch (e) {
          infos.push({
            success: false,
            type: 1,
            path,
            name: item.name,
            remark: item.remark,
            message: `${e.message || e}`,
          })
        }
      }
      await core.fixCron(deleteIds)
    }

    // 新增
    const createdIds = []
    if (newFiles && newFiles.length > 0) {
      // 先删除已存在的防止重复添加
      const deleteTask = await dbTasks.$list({
        type: 'system',
        bind: { in: newFiles.map((s) => toBind(type, s.path)) },
      })
      const deleteIds = deleteTask.map((s) => s.id)
      await dbTasks.$deleteById(deleteIds)
      await core.fixCron(deleteIds)
      // 插入定时任务
      for (const item of newFiles) {
        try {
          const task = await scriptResolve(item.path) // 获取任务信息（定时规则、名称）
          const data = {
            name: task.name,
            type,
            cron: task.cron,
            shell: `arcadia run ${task.runPath}`,
            active: item.active === 0 ? 0 : 1, // 默认启用
            config: '',
            tags: task.tags || '',
            create_time: new Date(),
            bind: toBind(type, item.path),
          }
          const createResult = await dbTasks.$create(data)
          createdIds.push(createResult.id)
          infos.push({
            success: true,
            type: 0,
            path: task.path,
            name: task.name,
            message: 'ok',
          })
        } catch (e) {
          const arr = item.path.split('/')
          const name = arr[arr.length - 1]
          infos.push({
            success: false,
            type: 0,
            path: item.path,
            name,
            message: `${e.message || e}`,
          })
        }
      }
    }

    await core.fixOrder()
    if (createdIds.length > 0) {
      await core.fixCron(createdIds)
    }
    response.send(API_STATUS_CODE.okData(infos))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
    logger.error('批量更新定时任务失败', e)
  }
})

module.exports.cronAPI = api
module.exports.innerCornApi = innerCornApi
