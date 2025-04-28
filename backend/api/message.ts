import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../http'
import type { WhereInput } from '../db'
import { message as dbMessage } from '../db'
import { validatePageParams, validateParams } from '../utils'
const api: Express = express()
const apiOpen: Express = express()

/**
 * 获取列表
 */
api.get('/list', async (request, response) => {
  try {
    const limit = Number.parseInt(request.query.limit as string) || 10
    const where: WhereInput['message'] = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status ? (request.query.status as string).split(',') : []
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      where.AND = {
        OR: [{ title: { contains: search } }, { content: { contains: search } }],
      }
    }
    const messages = await dbMessage.$list({
      take: limit,
      where,
      orderBy: {
        create_time: 'desc',
      },
    })
    response.send(API_STATUS_CODE.okData(messages))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/list', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['query', 'limit', [false, 'string']],
      ['query', 'status', [false, ['unread', 'read']]],
      ['query', 'source', [false, ['system', 'user']]],
      ['query', 'category', [false, ['info', 'error', 'warn']]],
    ])
    if (!/^\d+$/.test(request.query.limit as string) || Number.parseInt(request.query.limit as string) <= 0) {
      throw new Error('参数 limit 无效（参数值类型错误）')
    }
    const limit = Number.parseInt(request.query.limit as string) || 10
    const where: WhereInput['message'] = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status ? (request.query.status as string).split(',') : []
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
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
    const messages = await dbMessage.$list({
      take: limit,
      where,
      orderBy: {
        create_time: 'desc',
      },
    })
    response.send(API_STATUS_CODE.okData(messages))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取分页
 */
api.get('/page', async (request, response) => {
  try {
    const where: WhereInput['message'] = {}
    const and: WhereInput['message']['AND'] = []
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status ? (request.query.status as string).split(',') : []
      if (statusList.length > 0) {
        and.push({
          OR: statusList.map((status) => ({
            status: { equals: status },
          })),
        })
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      and.push({
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      })
    }
    if (and.length > 0) {
      where.AND = and
    }
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await dbMessage.$page({
      where,
      orderBy: [{ create_time: desc ? 'desc' : 'asc' }],
      page: request.query.page as unknown as string,
      size: request.query.size as unknown as string,
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validatePageParams(request)
    validateParams(request, [
      ['query', 'status', [false, ['unread', 'read']]],
      ['query', 'source', [false, ['system', 'user']]],
      ['query', 'category', [false, ['info', 'error', 'warn']]],
    ])
    const where: WhereInput['message'] = {}
    const and: WhereInput['message']['AND'] = []
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status ? (request.query.status as string).split(',') : []
      if (statusList.length > 0) {
        and.push({
          OR: statusList.map((status) => ({
            status: { equals: status },
          })),
        })
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      and.push({
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      })
    }
    if (and.length > 0) {
      where.AND = and
    }
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await dbMessage.$page({
      where,
      orderBy: [{ create_time: desc ? 'desc' : 'asc' }],
      page: request.query.page as unknown as number,
      size: request.query.size as unknown as number,
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取详情
 */
api.get('/detail', async (request, response) => {
  try {
    const { id } = request.query
    const message = await dbMessage.$getById(Number.parseInt(id as string))
    if (!message) {
      response.send(API_STATUS_CODE.fail('消息不存在'))
      return
    }
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/detail', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [['body', 'id', [true, 'number | number[]']]])
    const { id } = request.query
    const message = await dbMessage.$getById(Number.parseInt(id as string))
    if (!message) {
      response.send(API_STATUS_CODE.fail('消息不存在'))
      return
    }
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 统计数量
 */
api.get('/count', async (request, response) => {
  try {
    const where: WhereInput['message'] = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status ? (request.query.status as string).split(',') : []
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
    }

    const messages = await dbMessage.findMany({ where })
    response.send(API_STATUS_CODE.okData(messages.length))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/count', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['query', 'status', [false, ['unread', 'read']]],
      ['query', 'source', [false, ['system', 'user']]],
      ['query', 'category', [false, ['info', 'error', 'warn']]],
    ])
    const where: WhereInput['message'] = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status ? (request.query.status as string).split(',') : []
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source as string }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category as string }
    }
    const messages = await dbMessage.findMany({ where })
    response.send(API_STATUS_CODE.okData(messages.length))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 更新状态
 */
api.put('/status', async (request, response) => {
  try {
    const { id, status } = request.body
    const ids = Array.isArray(id) ? id : [id]
    if (ids.length > 0) {
      await dbMessage.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          status,
        },
      })
    }
    else {
      await dbMessage.updateMany({
        where: {
          status: { not: status },
        },
        data: {
          status,
        },
      })
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.post('/v1/status', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'id', [false, 'number | number[]']],
      ['body', 'status', [true, ['unread', 'read']]],
    ])
    const { id, status } = request.body
    const ids = Array.isArray(id) ? id : [id]
    if (ids.length > 0) {
      await dbMessage.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          status,
        },
      })
    }
    else {
      await dbMessage.updateMany({
        where: {
          status: { not: status },
        },
        data: {
          status,
        },
      })
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 删除
 */
api.delete('/delete', async (request, response) => {
  try {
    const { ids } = request.body
    await dbMessage.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.post('/v1/delete', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [['body', 'id', [true, 'number | number[]']]])
    const { id } = request.body
    const ids = Array.isArray(id) ? id : [id]
    await dbMessage.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

export {
  api as API,
  apiOpen as OpenAPI,
}
