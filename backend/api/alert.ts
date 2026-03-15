import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import db from '../db'
import { validateRequestParams } from '../utils'

const api: Express = express()

/**
 * 获取告警配置列表
 */
api.get('/config/page', async (request, response) => {
  try {
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }

    const result = await db.alertConfig.$page({
      orderBy: [{ id: desc ? 'desc' : 'asc' }],
      page: request.query.page as string,
      size: request.query.size as string,
    })

    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取告警配置详情
 */
api.get('/config/:id', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const config = await db.alertConfig.$getById(Number.parseInt(id))
    response.send(API_STATUS_CODE.okData(config))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 创建告警配置
 */
api.post('/config', async (request, response) => {
  try {
    validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ],
    })
    const config = Object.assign({}, request.body)
    delete config.id
    const createdConfig = await db.alertConfig.$create(config)
    response.send(API_STATUS_CODE.okData(createdConfig))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改告警配置
 */
api.put('/config', async (request, response) => {
  try {
    const config = Object.assign({}, request.body)

    if (!config.id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }

    const updatedConfig = await db.alertConfig.update({
      where: { id: config.id },
      data: config,
    })
    response.send(API_STATUS_CODE.okData(updatedConfig))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除告警配置
 */
api.delete('/config', async (request, response) => {
  try {
    const id = request.body.id

    if (!id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }

    await db.alertConfig.$deleteById(id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取告警规则列表
 */
api.get('/rule/page', async (request, response) => {
  try {
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }

    const result = await db.alertConfigRule.$page({
      orderBy: [{ id: desc ? 'desc' : 'asc' }],
      page: request.query.page as string,
      size: request.query.size as string,
    })

    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取告警规则详情
 */
api.get('/rule/:id', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const rule = await db.alertConfigRule.$getById(Number.parseInt(id))
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 创建告警规则
 */
api.post('/rule', async (request, response) => {
  try {
    const rule = Object.assign({}, request.body)
    delete rule.id

    const createdRule = await db.alertConfigRule.$create(rule)
    response.send(API_STATUS_CODE.okData(createdRule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改告警规则
 */
api.put('/rule', async (request, response) => {
  try {
    const rule = Object.assign({}, request.body)

    if (!rule.id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }

    const updatedRule = await db.alertConfigRule.update({
      where: { id: rule.id },
      data: rule,
    })
    response.send(API_STATUS_CODE.okData(updatedRule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除告警规则
 */
api.delete('/rule', async (request, response) => {
  try {
    const id = request.body.id

    if (!id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }

    await db.alertConfigRule.$deleteById(id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取通知规则列表
 */
api.get('/notify/page', async (request, response) => {
  try {
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }

    const result = await db.alertConfigNotify.$page({
      orderBy: [{ id: desc ? 'desc' : 'asc' }],
      page: request.query.page as string,
      size: request.query.size as string,
    })

    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取通知规则详情
 */
api.get('/notify/:id', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const notify = await db.alertConfigNotify.$getById(Number.parseInt(id))
    response.send(API_STATUS_CODE.okData(notify))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 创建通知规则
 */
api.post('/notify', async (request, response) => {
  try {
    const notify = Object.assign({}, request.body)
    delete notify.id

    const createdNotify = await db.alertConfigNotify.$create(notify)
    response.send(API_STATUS_CODE.okData(createdNotify))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改通知规则
 */
api.put('/notify', async (request, response) => {
  try {
    const notify = Object.assign({}, request.body)

    if (!notify.id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }

    const updatedNotify = await db.alertConfigNotify.update({
      where: { id: notify.id },
      data: notify,
    })
    response.send(API_STATUS_CODE.okData(updatedNotify))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除通知规则
 */
api.delete('/notify', async (request, response) => {
  try {
    const id = request.body.id

    if (!id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }

    await db.alertConfigNotify.$deleteById(id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export {
  api as API,
}
