const express = require('express')
const api = express()
const apiOpen = express()
const { API_STATUS_CODE } = require('../http')

const db = require('../db').message
const { validateParams, validatePageParams } = require('../utils')

/**
 * 获取列表
 */
api.get('/list', async (request, response) => {
  try {
    const limit = parseInt(request.query.limit) || 10
    const where = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status.split(',')
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search
      where.AND = {
        OR: [{ title: { contains: search } }, { content: { contains: search } }],
      }
    }
    const messages = await db.$list({
      take: limit,
      where,
      orderBy: {
        create_time: 'desc',
      },
    })
    response.send(API_STATUS_CODE.okData(messages))
  }
  catch (e) {
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
    if (!/^\d+$/.test(request.query.limit) || parseInt(request.query.limit) <= 0) {
      throw new Error('参数 limit 无效（参数值类型错误）')
    }
    const limit = parseInt(request.query.limit) || 10
    const where = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status.split(',')
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search
      where.AND = {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      }
    }
    const messages = await db.$list({
      take: limit,
      where,
      orderBy: {
        create_time: 'desc',
      },
    })
    response.send(API_STATUS_CODE.okData(messages))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取分页
 */
api.get('/page', async (request, response) => {
  try {
    const where = {}
    const and = []
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status.split(',')
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
      where.source = { equals: request.query.source }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search
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
    const result = await db.$page({
      where,
      orderBy: [{ create_time: desc ? 'desc' : 'asc' }],
      page: request.query.page,
      size: request.query.size,
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e) {
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
    const where = {}
    const and = []
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status.split(',')
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
      where.source = { equals: request.query.source }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search
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
    const result = await db.$page({
      where,
      orderBy: [{ create_time: desc ? 'desc' : 'asc' }],
      page: request.query.page,
      size: request.query.size,
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取详情
 */
api.get('/detail', async (request, response) => {
  try {
    const { id } = request.query
    const message = await db.$getById(parseInt(id))
    if (!message) {
      return response.send(API_STATUS_CODE.fail('消息不存在'))
    }
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/detail', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [['body', 'id', [true, 'number | number[]']]])
    const { id } = request.query
    const message = await db.$getById(parseInt(id))
    if (!message) {
      return response.send(API_STATUS_CODE.fail('消息不存在'))
    }
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 统计数量
 */
api.get('/count', async (request, response) => {
  try {
    const where = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status.split(',')
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category }
    }

    const messages = await db.findMany({ where })
    response.send(API_STATUS_CODE.okData(messages.length))
  }
  catch (e) {
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
    const where = {}
    // 状态过滤
    if (request.query.status) {
      const statusList = request.query.status.split(',')
      if (statusList.length > 0) {
        where.OR = statusList.map((status) => ({
          status: { equals: status },
        }))
      }
    }
    // 消息来源过滤
    if (request.query.source) {
      where.source = { equals: request.query.source }
    }
    // 消息类型过滤
    if (request.query.category) {
      where.category = { equals: request.query.category }
    }
    const messages = await db.findMany({ where })
    response.send(API_STATUS_CODE.okData(messages.length))
  }
  catch (e) {
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
      await db.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          status,
        },
      })
    }
    else {
      await db.updateMany({
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
  catch (e) {
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
      await db.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          status,
        },
      })
    }
    else {
      await db.updateMany({
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
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 删除
 */
api.delete('/delete', async (request, response) => {
  try {
    const { ids } = request.body
    await db.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.post('/v1/delete', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [['body', 'id', [true, 'number | number[]']]])
    const { id } = request.body
    const ids = Array.isArray(id) ? id : [id]
    await db.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

module.exports = {
  API: api,
  OpenAPI: apiOpen,
}
