const express = require('express')
const api = express()
const { API_STATUS_CODE } = require('../http')

const dbConfig = require('../db').config

api.get('/type', async (request, response) => {
  response.send(API_STATUS_CODE.okData(await dbConfig.$list({ type: request.params.type }, { sort: 'asc' })))
})

/**
 * 分页查询
 */
api.get('/type/page', async (request, response) => {
  const filter = Object.assign({}, request.query)
  const data = await dbConfig.$page({
    where: filter,
    orderBy: {
      sort: 'asc',
    },
    page: request.query.page,
    size: request.query.size,
  })
  response.send(API_STATUS_CODE.okData(data))
})

/**
 * 创建
 */
api.post('/type', async (request, response) => {
  const task = Object.assign({}, request.body, { create_time: new Date() })
  delete task.id
  try {
    response.send(API_STATUS_CODE.okData(await dbConfig.create({ data: task })))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改
 */
api.put('/type', async (request, response) => {
  const task = Object.assign({}, request.body)
  try {
    response.send(API_STATUS_CODE.okData(await dbConfig.$updateById(task)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除
 */
api.delete('/type', async (request, response) => {
  try {
    response.send(API_STATUS_CODE.okData(await dbConfig.$deleteById(request.id)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 根据类型查询
 */
api.get('/type/:type', async (request, response) => {
  response.send(API_STATUS_CODE.okData(await dbConfig.$list({ type: request.params.type }, { sort: 'asc' })))
})

/**
 * 根据类型查询一个
 */
api.get('/type/single/:type', async (request, response) => {
  const configs = await dbConfig.findFirst({
    where: {
      type: request.params.type,
    },
    orderBy: {
      sort: 'asc',
    },
  })
  response.send(API_STATUS_CODE.okData(configs?.length > 0 ? configs[0] : null))
})

module.exports = {
  API: api,
}
