import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import type { messageWhereInput } from '../db'
import db from '../db'
import { validateRequestParams } from '../utils'

const api: Express = express()

// todo: 无权限新增

/**
 * 获取消息列表
 */
api.get('/page', async (request, response) => {
  try {
    const where: messageWhereInput = {}

    // 类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
    }

    // 状态过滤
    if (request.query.status) {
      where.status = Number.parseInt(request.query.status as string)
    }

    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }

    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      where.AND = {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      }
    }

    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }

    const result = await db.message.$page({
      where,
      orderBy: [{ create_time: desc ? 'desc' : 'asc' }],
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
 * 获取消息详情
 */
api.get('/:id', async (request, response) => {
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
    const message = await db.message.$getById(Number.parseInt(id))
    if (!message) {
      response.send(API_STATUS_CODE.fail('消息不存在'))
      return
    }
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 创建消息
 */
api.post('/', async (request, response) => {
  try {
    const message = Object.assign({}, request.body)
    delete message.id
    const createdMessage = await db.message.$create(message)
    response.send(API_STATUS_CODE.okData(createdMessage))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改消息
 */
api.put('/', async (request, response) => {
  try {
    const message = Object.assign({}, request.body)
    if (!message.id) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 id'))
      return
    }
    const updatedMessage = await db.message.update({
      where: { id: message.id },
      data: message,
    })
    response.send(API_STATUS_CODE.okData(updatedMessage))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除消息
 */
api.delete('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    })
    const { id } = params.body
    const ids: number[] = Array.isArray(id) ? id : [id]
    await db.message.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新消息状态
 */
api.put('/status', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
        ['status', [true, 'number']],
      ] as const,
    })
    const { id, status } = params.body
    const ids: number[] = Array.isArray(id) ? id : [id]
    await db.message.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
      },
    })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export {
  api as API,
}
