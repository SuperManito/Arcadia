const express = require('express')
const api = express()
const apiOpen = express()
const { API_STATUS_CODE } = require('../http')

const dbNotify = require('../db').notify
let maxId = 0

/**
 * @type {function[]}
 */
let newNotify = []

/**
 * 获取新消息数量,需要传递上次获取的最后一条消息的id (?lastId)
 */
api.get('/total', async (request, response) => {
  try {
    await new Promise((r) => {
      // 注册新消息通知
      newNotify.push(r)
      // 一段时间后返回
      setTimeout(() => r(), 20 * 1000)
      // 删除在数组中旧的r
      newNotify = newNotify.filter((e) => e !== r)
    })
    const number = Math.max(maxId - (request.query.lastId || 0), 0)
    response.send(API_STATUS_CODE.okData(number))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})
/**
 * 获取通知列表
 */
api.get('/page', async (request, response) => {
  try {
    const filter = Object.assign({}, request.query)
    response.send(API_STATUS_CODE.okData(await dbNotify.$page({
      where: filter,
      page: request.query.page,
      size: request.query.size,
      orderBy: { id: 'desc' },
    })))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})
apiOpen.post('/new', async (request, response) => {
  try {
    const notify = request.body
    const newNotify1 = await dbNotify.create({ data: notify })
    maxId = newNotify1.id
    newNotify.forEach((r) => r())
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})
;(async () => {
  const last = await dbNotify.findFirst({
    orderBy: {
      id: 'desc',
    },
  })
  if (last) {
    maxId = last.id
  }
})()

module.exports = {
  API: api,
  OpenAPI: apiOpen,
}
