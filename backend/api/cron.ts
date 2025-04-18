import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../http'
import { logger } from '../logger'
import { validateCronExpression } from '../cron/engine'
import { applyCron, fixOrder, getBindGroup, runningTasks, runTask, terminateTask, updateSortById } from '../cron'
import type { Tasks, TasksResult, WhereInput } from '../db'
import { tasks as dbTasks } from '../db'
import type { CodeFileResolveResult } from '../file'
import { codeFileResolve } from '../file'
import { APP_DIR_PATH, APP_DIR_TYPE } from '../type'
import type { ValidateObjectParamType } from '../utils'
import { cleanProperties, validateObject, validatePageParams, validateParams } from '../utils'

const api: Express = express()
const apiOpen: Express = express()
const apiInner: Express = express()

type CronType = 'system' | 'user'

interface TaskConfig {
  before_task_shell: string
  after_task_shell: string
  log_directory: string
  source_file: string
  allow_concurrency: boolean
}

interface InnerOpreateResult {
  success: boolean
  type: number
  path: string
  name: string
  remark: string
  message: string
}

/**
 * 获取定时任务列表
 */
api.get('/', async (request, response) => {
  try {
    const active = request.query.active ? (request.query.active as string).split(',') : []
    const tags = request.query.tags ? (request.query.tags as string).split(',').map((s) => s.trim()).filter((s) => s) : []
    const filter = Object.assign({}, request.query)
    delete filter.active
    delete filter.tags
    delete filter.orderBy
    delete filter.order
    const where: WhereInput['tasks'] = filter
    const and: WhereInput['tasks']['AND'] = []
    // 任务标签过滤
    if (tags.length > 0) {
      const tagFilters = tags.map((tag) => ({ tags: { contains: tag } }))
      and.push({ OR: tagFilters })
    }
    // 启用/禁用状态过滤
    if (active.length > 0) {
      const activeFilters = active.map((active) => ({ active: { equals: Number.parseInt(active) } }))
      and.push({ OR: activeFilters })
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      and.push({
        OR: [
          { name: { contains: search } },
          { shell: { contains: search } },
        ],
      })
    }
    if (and.length > 0) {
      where.AND = and
    }
    for (const fieldsKey in dbTasks.fields) {
      if (where[fieldsKey]) {
        where[fieldsKey] = { contains: where[fieldsKey] }
      }
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const tasks = await dbTasks.$page({
      where,
      orderBy: [
        { [orderBy]: desc ? 'desc' : 'asc' },
      ],
      page: request.query.page as unknown as string,
      size: request.query.size as unknown as string,
    })
    // 格式化数据
    tasks.data.forEach((task: TasksResult) => {
      // 创建时间
      if (task.create_time) {
        task.create_time = new Date(task.create_time)
      }
      // 上次运行时间
      if (task.last_runtime) {
        task.last_runtime = new Date(task.last_runtime)
      }
      // 当前运行状态
      task.is_running = !!runningTasks[task.id]
      // 日志路径与代码文件（临时）
      task.log_path = ''
      task.script_path = ''
      if (task.bind && task.bind.startsWith('system#')) {
        try {
          const [_type, targetDir, targetFile] = task.bind.split('#')
          if (task.last_runtime) {
            try {
              task.log_path = `${APP_DIR_PATH.LOG}/${targetDir}/${targetFile.split('.')[0]}`
            }
            catch {
              task.log_path = ''
            }
          }
          task.script_path = `${targetDir === APP_DIR_TYPE.RAW ? APP_DIR_PATH.RAW : `${APP_DIR_PATH.REPO}/${targetDir}`}/${targetFile}`
        }
        catch {
          task.log_path = ''
          task.script_path = ''
        }
      }
    })
    // 返回数据
    response.send(API_STATUS_CODE.okData(tasks))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validatePageParams(request, ['sort', 'last_runtime', 'last_run_use'])
    validateParams(request, [
      ['query', 'type', [false, ['user', 'system']]],
      ['query', 'active', [false, ['1', '0']]],
      ['query', 'tags', [false, 'string', true]],
    ])
    const active = request.query.active ? (request.query.active as string).split(',') : []
    const tags = request.query.tags ? (request.query.tags as string).split(',').map((s) => s.trim()).filter((s) => s) : []
    const filter = Object.assign({}, request.query)
    delete filter.active
    delete filter.tags
    delete filter.orderBy
    delete filter.order
    const where: WhereInput['tasks'] = filter
    const and: WhereInput['tasks']['AND'] = []
    // 任务标签过滤
    if (tags.length > 0) {
      const tagFilters = tags.map((tag) => ({ tags: { contains: tag } }))
      and.push({ OR: tagFilters })
    }
    // 启用/禁用状态过滤
    if (active.length > 0) {
      const activeFilters = active.map((active) => ({ active: { equals: Number.parseInt(active) } }))
      and.push({ OR: activeFilters })
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      and.push({
        OR: [
          { name: { contains: search } },
          { shell: { contains: search } },
        ],
      })
    }
    if (and.length > 0) {
      where.AND = and
    }
    for (const fieldsKey in dbTasks.fields) {
      if (where[fieldsKey]) {
        where[fieldsKey] = { contains: where[fieldsKey] }
      }
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const tasks = await dbTasks.$page({
      where,
      orderBy: [
        { [orderBy]: desc ? 'desc' : 'asc' },
      ],
      page: request.query.page as unknown as string,
      size: request.query.size as unknown as string,
    })
    // 格式化数据
    tasks.data.forEach((task: TasksResult) => {
      // 创建时间
      if (task.create_time) {
        task.create_time = new Date(task.create_time)
      }
      // 上次运行时间
      if (task.last_runtime) {
        task.last_runtime = new Date(task.last_runtime)
      }
      // 当前运行状态
      task.is_running = !!runningTasks[task.id]
    })
    // 返回数据
    response.send(API_STATUS_CODE.okData(tasks))
  }
  catch (e: any) {
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
    if (!/^\d+$/.test(id as string) || Number.parseInt(id as string) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const record = await dbTasks.$getById(Number.parseInt(id as string))
    if (!record) {
      throw new Error('任务不存在')
    }
    // 返回数据
    response.send(API_STATUS_CODE.okData(record))
  }
  catch (e: any) {
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
    await fixOrder()
    await applyCron(createResult.id)
  }
  catch (e: any) {
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
    const task = cleanProperties(Object.assign({}, request.body), ['name', 'cron', 'shell', 'active', 'remark', 'config'])
    // 校验高级配置
    if (task.config) {
      let config: TaskConfig = task.config
      const configValidateRules: ValidateObjectParamType[] = [
        ['before_task_shell', [false, 'string']],
        ['after_task_shell', [false, 'string']],
        ['log_directory', [false, 'string']],
        ['source_file', [false, 'string']],
        ['allow_concurrency', [false, 'boolean']],
      ]
      validateObject(config, configValidateRules, 'config')
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
    logger.info('[OpenAPI · Cron]', '添加定时任务', JSON.stringify(task))
    await fixOrder()
    await applyCron(createResult.id)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改
 */
api.put('/', async (request, response) => {
  try {
    let tasks: Tasks[]
    if (Array.isArray(request.body)) {
      tasks = request.body.map((task) => Object.assign({}, task))
    }
    else {
      tasks = [Object.assign({}, request.body)]
    }
    for (const task of tasks) {
      if ('orderBy' in task)
        delete (task as any).orderBy
      if ('bind' in task)
        delete (task as any).bind
      if ('create_time' in task)
        delete (task as any).create_time
      // 校验定时规则
      if (task.cron) {
        validateCronExpression(task.cron)
      }
    }
    const results: boolean[] = []
    const needFixCronIds: number[] = []
    for (const task of tasks) {
      const originTask = await dbTasks.$getById(task.id) as Tasks
      try {
        const res = await dbTasks.update({ data: task, where: { id: task.id } })
        logger.info('修改定时任务', JSON.stringify(res))
        // 定时规则变更，重新加载定时任务
        if (task && task.cron && originTask.cron !== task.cron) {
          needFixCronIds.push(task.id)
        }
        results.push(true)
      }
      catch (error: any) {
        logger.error('修改定时任务失败', JSON.stringify(error.message || error))
        results.push(false)
      }
    }
    const result = results.every(Boolean)
    response.send(API_STATUS_CODE.okData(result))
    if (needFixCronIds.length > 0) {
      await applyCron(needFixCronIds)
    }
  }
  catch (e: any) {
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
    const task = cleanProperties(Object.assign({}, request.body), ['id', 'name', 'cron', 'shell', 'type', 'active', 'remark', 'config'])
    // 校验高级配置
    if (task.config) {
      let config: TaskConfig = task.config
      const configValidateRules: ValidateObjectParamType[] = [
        ['before_task_shell', [false, 'string']],
        ['after_task_shell', [false, 'string']],
        ['log_directory', [false, 'string']],
        ['source_file', [false, 'string']],
        ['allow_concurrency', [false, 'boolean']],
      ]
      validateObject(config, configValidateRules, 'config')
      config = cleanProperties(config, configValidateRules.map((rule) => rule[0]))
      task.config = Object.keys(config).length === 0 ? '' : JSON.stringify(config) // 转为字符串
    }
    // 校验定时规则
    if (task.cron) {
      validateCronExpression(task.cron)
    }
    // 操作数据库
    const res = await dbTasks.update({ data: task, where: { id: task.id } })
    response.send(API_STATUS_CODE.okData(res))
    logger.info('[OpenAPI · Cron]', '修改定时任务', JSON.stringify(task))
    // 定时规则变更，重新加载定时任务
    if (task && task.cron && record.cron !== task.cron) {
      await applyCron(task.id)
    }
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除
 */
api.delete('/', async (request, response) => {
  try {
    const id = request.body.id
    let ids: number[]
    if (Array.isArray(id)) {
      ids = id
    }
    else {
      ids = [id]
    }
    const res = await dbTasks.$deleteById(ids)
    response.send(API_STATUS_CODE.okData(res))
    if (res) {
      logger.info('删除定时任务', ids.join(','))
      await fixOrder()
      await applyCron(ids)
    }
  }
  catch (e: any) {
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
    let ids: number[]
    if (Array.isArray(id)) {
      ids = id
    }
    else {
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
      logger.info('[OpenAPI · Cron]', '删除定时任务', ids.join(','))
      await fixOrder()
      await applyCron(ids)
    }
  }
  catch (e: any) {
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
      response.send(API_STATUS_CODE.fail('请提供完整参数'))
      return
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await dbTasks.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        response.send(API_STATUS_CODE.fail('未找到最大排序值'))
        return
      }
    }
    response.send(API_STATUS_CODE.okData(await updateSortById(id, order)))
    await fixOrder()
  }
  catch (e: any) {
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
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    if (order && order <= 0) {
      response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
      return
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await dbTasks.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        response.send(API_STATUS_CODE.fail('未找到最大排序值'))
        return
      }
    }
    response.send(API_STATUS_CODE.okData(await updateSortById(id, order)))
    await fixOrder()
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取标签列表
 */
api.get('/bindGroup', async (_request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(await getBindGroup()))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/tagsList', async (_request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(await getBindGroup()))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 查询正在运行中的任务
 */
api.get('/runningTasks', async (_request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(Object.values(runningTasks)))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/runningTasks', async (_request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(Object.values(runningTasks)))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 主动运行任务
 */
api.post('/run', async (request, response) => {
  try {
    const id = request.body.id
    let ids: number[]
    if (Array.isArray(id)) {
      ids = id
    }
    else {
      ids = [id]
    }
    for (const id of ids) {
      runTask(id)
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/run', async (request, response) => {
  try {
    const id = request.body.id
    let ids: number[]
    if (Array.isArray(id)) {
      ids = id
    }
    else {
      ids = [id]
    }
    for (const id of ids) {
      runTask(id)
    }
    response.send(API_STATUS_CODE.ok())
    logger.info('[OpenAPI · Cron]', '运行定时任务', ids.join(','))
  }
  catch (e: any) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 终止正在运行的任务
 */
api.post('/terminate', async (request, response) => {
  try {
    const id = request.body.id
    let ids: number[]
    if (Array.isArray(id)) {
      ids = id
    }
    else {
      ids = [id]
    }
    for (const id of ids) {
      terminateTask(id)
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/terminate', async (request, response) => {
  const id = request.body.id
  try {
    let ids: number[]
    if (Array.isArray(id)) {
      ids = id
    }
    else {
      ids = [id]
    }
    for (const id of ids) {
      terminateTask(id)
    }
    response.send(API_STATUS_CODE.ok())
    logger.info('[OpenAPI · Cron]', '终止定时任务', ids.join(','))
  }
  catch (e: any) {
    logger.error(e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 将路径转换为 bind 字符串
 */
function convertPathToBind(type: CronType, s: string) {
  let prefix = `${APP_DIR_PATH.REPO}/`
  if (s.startsWith(prefix)) {
    s = s.replace(prefix, '')
  }
  prefix = `${APP_DIR_PATH.RAW}/`
  if (s.startsWith(prefix)) {
    s = s.replace(prefix, `${APP_DIR_TYPE.RAW}/`)
  }
  return `${type}#${s.substring(0, s.indexOf('/'))}#${s.substring(s.indexOf('/') + 1)}`
}

/**
 * 批量更新定时任务（底层专用）
 */
apiInner.post('/updateAll', async (request, response) => {
  try {
    const infos: InnerOpreateResult[] = []
    const { deleteFiles, newFiles, type } = request.body

    // 删除
    if (deleteFiles && deleteFiles.length > 0) {
      const deleteTask = await dbTasks.$list({
        type: 'system',
        bind: { in: deleteFiles.map((s: CodeFileResolveResult) => convertPathToBind(type, s.path)) },
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
        }
        catch (e: any) {
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
      await applyCron(deleteIds)
    }

    // 新增
    const createdIds: number[] = []
    if (newFiles && newFiles.length > 0) {
      // 先删除已存在的防止重复添加
      const deleteTask = await dbTasks.$list({
        type: 'system',
        bind: { in: newFiles.map((s: CodeFileResolveResult) => convertPathToBind(type, s.path)) },
      })
      const deleteIds = deleteTask.map((s) => s.id)
      await dbTasks.$deleteById(deleteIds)
      await applyCron(deleteIds)
      // 插入定时任务
      for (const item of newFiles) {
        try {
          const task = await codeFileResolve(item.path) // 获取任务信息（定时规则、名称）
          if (!task)
            continue
          const data = {
            name: task.name,
            type,
            cron: task.cron,
            shell: `arcadia run ${task.runPath}`,
            active: item.active === 0 ? 0 : 1, // 默认启用
            config: '',
            tags: task.tags || '',
            create_time: new Date(),
            bind: convertPathToBind(type, item.path),
          }
          const createResult = await dbTasks.$create(data) as Tasks
          createdIds.push(createResult.id)
          infos.push({
            success: true,
            type: 0,
            path: task.path,
            name: task.name,
            remark: '',
            message: 'success',
          })
        }
        catch (e: any) {
          const arr = item.path.split('/')
          const name = arr[arr.length - 1]
          infos.push({
            success: false,
            type: 0,
            path: item.path,
            name,
            remark: '',
            message: `${e.message || e}`,
          })
        }
      }
    }

    await fixOrder()
    if (createdIds.length > 0) {
      await applyCron(createdIds)
    }
    response.send(API_STATUS_CODE.okData(infos))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
    logger.error('批量更新定时任务失败', e)
  }
})

export {
  api as API,
  apiInner as InnerAPI,
  apiOpen as OpenAPI,
}
