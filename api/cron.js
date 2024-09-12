const express = require('express')
const api = express()
const apiOpen = express()
const apiInner = express()
const { API_STATUS_CODE } = require('../core/http')
const { logger } = require('../core/logger')

const { validateCronExpression } = require('../core/cron/engine')
const core = require('../core/cron/core')
const dbTasks = require('../core/db').tasks
const scriptResolve = require('../core/file/scriptResolve')
const { APP_DIR_TYPE, APP_DIR_PATH } = require('../core/type')
const { validateParams, validateObject, cleanProperties } = require('../core/utils')

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
    // 任务标签过滤
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
    // 格式化数据
    tasks.data.forEach((task) => {
      // 创建时间
      if (task.create_time) {
        task.create_time = new Date(task.create_time)
      }
      // 上次运行时间
      if (task.last_runtime) {
        task.last_runtime = new Date(task.last_runtime)
      }
      // 当前运行状态
      task.is_running = !!core.runningTasks[task.id]
      // 日志路径与代码文件（临时）
      task.log_path = ''
      task.script_path = ''
      if (task.bind && task.bind.startsWith('system#')) {
        try {
          // eslint-disable-next-line no-unused-vars
          const [_type, targetDir, targetFile] = task.bind.split('#')
          if (task.last_runtime) {
            try {
              task.log_path = `${APP_DIR_PATH.LOG}/${targetDir}/${targetFile.split('.')[0]}`
            } catch {
              task.log_path = ''
            }
          }
          task.script_path = `${targetDir === APP_DIR_TYPE.RAW ? APP_DIR_PATH.RAW : `${APP_DIR_PATH.REPO}/${targetDir}`}/${targetFile}`
        } catch {
          task.log_path = ''
          task.script_path = ''
        }
      }
    })
    // 返回数据
    response.send(API_STATUS_CODE.okData(tasks))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['query', 'type', [false, ['user', 'system']]],
      ['query', 'active', [false, ['1', '0']]],
    ])
    const active = request.query.active ? request.query.active.split(',') : []
    const tags = request.query.tags ? request.query.tags.split(',').map((s) => s.trim()).filter((s) => s) : []
    const filter = Object.assign({}, request.query)
    delete filter.active
    delete filter.tags
    delete filter.orderBy
    delete filter.order
    const where = filter
    const or = []
    // 任务标签过滤
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
    // 格式化数据
    tasks.data.forEach((task) => {
      // 创建时间
      if (task.create_time) {
        task.create_time = new Date(task.create_time)
      }
      // 上次运行时间
      if (task.last_runtime) {
        task.last_runtime = new Date(task.last_runtime)
      }
      // 当前运行状态
      task.is_running = !!core.runningTasks[task.id]
    })
    // 返回数据
    response.send(API_STATUS_CODE.okData(tasks))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 查询
 */
apiOpen.get('/v1/query', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['query', 'id', [true, 'string']],
    ])
    const id = request.query.id
    if (!/^\d+$/.test(id) || parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const record = await dbTasks.$getById(parseInt(id))
    if (!record) {
      throw new Error('任务不存在')
    }
    // 返回数据
    response.send(API_STATUS_CODE.okData(record))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 创建定时任务
 */
api.post('/', async (request, response) => {
  try {
    const task = Object.assign({}, request.body, { create_time: new Date() })
    delete task.id
    // 校验定时规则
    validateCronExpression(task.cron)
    const createResult = await dbTasks.$create(task)
    response.send(API_STATUS_CODE.okData(createResult))
    logger.info('添加定时任务', JSON.stringify(task))
    await core.fixOrder()
    await core.applyCron(createResult.id)
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/create', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'name', [true, 'string']],
      ['body', 'cron', [true, 'string']],
      ['body', 'shell', [true, 'string']],
      ['body', 'active', [false, [1, 0]]],
      ['body', 'remark', [false, 'string']],
      ['body', 'config', [false, 'object']],
    ])
    let task = Object.assign({}, request.body)
    task = cleanProperties(request.body, ['name', 'cron', 'shell', 'active', 'remark', 'config'])
    // 校验高级配置
    if (task.config) {
      let config = task.config
      const configValidateRules = [
        ['before_task_shell', [false, 'string']],
        ['after_task_shell', [false, 'string']],
        ['log_directory', [false, 'string']],
        ['source_file', [false, 'string']],
        ['allow_concurrency', [false, 'boolean']],
      ]
      validateObject(config, configValidateRules)
      config = cleanProperties(config, configValidateRules.map((rule) => rule[0]))
      task.config = Object.keys(config).length === 0 ? '' : JSON.stringify(config) // 转为字符串
    }
    // 校验定时规则
    validateCronExpression(task.cron)
    // 补齐参数
    Object.assign(task, {
      type: 'user', // 只允许创建用户任务
      create_time: new Date(),
    })
    // 操作数据库
    const createResult = await dbTasks.$create(task)
    response.send(API_STATUS_CODE.okData(createResult))
    logger.info('添加定时任务', JSON.stringify(task))
    await core.fixOrder()
    await core.applyCron(createResult.id)
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改
 */
api.put('/', async (request, response) => {
  try {
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
      // 校验定时规则
      validateCronExpression(task.cron)
    }
    const results = []
    const needFixCronIds = []
    for (const task of tasks) {
      const originTask = await dbTasks.$getById(task.id)
      try {
        const res = await dbTasks.update({ data: task, where: { id: task.id } })
        logger.info('修改定时任务', JSON.stringify(res))
        // 定时规则变更，重新加载定时任务
        if (task && task.cron && originTask.cron !== task.cron) {
          needFixCronIds.push(task.id)
        }
        results.push(true)
      } catch (error) {
        logger.error('修改定时任务失败', JSON.stringify(error.message || error))
        results.push(false)
      }
    }
    const result = results.every(Boolean)
    response.send(API_STATUS_CODE.okData(result))
    if (needFixCronIds.length > 0) {
      await core.applyCron(needFixCronIds)
    }
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/update', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'id', [true, 'number']],
      ['body', 'name', [false, 'string']],
      ['body', 'cron', [false, 'string']],
      ['body', 'shell', [false, 'string']],
      ['body', 'active', [false, [1, 0]]],
      ['body', 'remark', [false, 'string']],
      ['body', 'config', [false, 'object']],
    ])
    if (request.body.id <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const record = await dbTasks.$getById(request.body.id)
    if (!record) {
      throw new Error('任务不存在')
    }
    let task = Object.assign({}, request.body)
    task = cleanProperties(request.body, ['id', 'name', 'cron', 'shell', 'type', 'active', 'remark', 'config'])
    // 校验高级配置
    if (task.config) {
      let config = task.config
      const configValidateRules = [
        ['before_task_shell', [false, 'string']],
        ['after_task_shell', [false, 'string']],
        ['log_directory', [false, 'string']],
        ['source_file', [false, 'string']],
        ['allow_concurrency', [false, 'boolean']],
      ]
      validateObject(config, configValidateRules)
      config = cleanProperties(config, configValidateRules.map((rule) => rule[0]))
      task.config = Object.keys(config).length === 0 ? '' : JSON.stringify(config) // 转为字符串
    }
    // 校验定时规则
    validateCronExpression(task.cron)
    // 操作数据库
    const res = await dbTasks.update({ data: task, where: { id: task.id } })
    response.send(API_STATUS_CODE.okData(res))
    logger.info('修改定时任务', JSON.stringify(task))
    // 定时规则变更，重新加载定时任务
    if (task && task.cron && record.cron !== task.cron) {
      await core.applyCron(task.id)
    }
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除
 */
api.delete('/', async (request, response) => {
  try {
    const id = request.body.id
    let ids
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    const res = await dbTasks.$deleteById(ids)
    response.send(API_STATUS_CODE.okData(res))
    if (res) {
      logger.info('删除定时任务', ids.join(','))
      await core.fixOrder()
      await core.applyCron(ids)
    }
  } catch (e) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/delete', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'id', [true, 'number | number[]']],
    ])
    const id = request.body.id
    let ids
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    const res = await dbTasks.$deleteById(ids)
    response.send(API_STATUS_CODE.okData(res))
    if (res) {
      logger.info('删除定时任务', ids.join(','))
      await core.fixOrder()
      await core.applyCron(ids)
    }
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
      const data = await dbTasks.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
      }
    }
    response.send(API_STATUS_CODE.okData(await core.updateSortById(id, order)))
    await core.fixOrder()
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/order', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'id', [true, 'number']],
      ['body', 'order', [false, 'number']],
      ['body', 'moveToEnd', [false, 'boolean']],
    ])
    const id = request.body.id
    let order = request.body.order
    if (!order && !request.body.moveToEnd) {
      return response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
    }
    if (order && order <= 0) {
      return response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await dbTasks.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
      }
    }
    response.send(API_STATUS_CODE.okData(await core.updateSortById(id, order)))
    await core.fixOrder()
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取标签列表
 */
api.get('/bindGroup', async (request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(await core.getBindGroup()))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/tagsList', async (request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(await core.getBindGroup()))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 查询正在运行中的任务
 */
api.get('/runningTasks', async (request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(Object.values(core.runningTasks)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/runningTasks', async (request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(Object.values(core.runningTasks)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 主动运行任务
 */
function handleRun(id, response) {
  try {
    let ids
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    for (const id of ids) {
      core.runTask(id)
    }
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
}

api.post('/run', async (request, response) => {
  handleRun(request.body.id, response)
})

apiOpen.post('/v1/run', async (request, response) => {
  handleRun(request.body.id, response)
})

/**
 * 终止正在运行的任务
 */
function handleTerminate(id, response) {
  try {
    let ids
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    for (const id of ids) {
      core.terminateTask(id)
    }
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
}

api.post('/terminate', async (request, response) => {
  handleTerminate(request.body.id, response)
})

apiOpen.post('/v1/terminate', async (request, response) => {
  handleTerminate(request.body.id, response)
})

/**
 * 批量更新定时任务（底层专用）
 */
apiInner.post('/updateAll', async (request, response) => {
  function toBind(type, s) {
    let prefix = `${APP_DIR_PATH.REPO}/`
    if (s.startsWith(prefix)) {
      s = s.replace(prefix, '')
    }
    prefix = `${APP_DIR_PATH.REPO.RAW}/`
    if (s.startsWith(prefix)) {
      s = s.replace(prefix, `${APP_DIR_TYPE.RAW}/`)
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
        bind: { in: deleteFiles.map((s) => toBind(type, s.path)) },
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
            message: 'success',
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
      await core.applyCron(deleteIds)
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
      await core.applyCron(deleteIds)
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
            message: 'success',
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
      await core.applyCron(createdIds)
    }
    response.send(API_STATUS_CODE.okData(infos))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
    logger.error('批量更新定时任务失败', e)
  }
})

module.exports = {
  API: api,
  OpenAPI: apiOpen,
  InnerAPI: apiInner,
}
