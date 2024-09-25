const express = require('express')
const api = express()
const { API_STATUS_CODE } = require('../http')

/**
 * 健康检测
 */
api.get('/health', async (request, response) => {
  response.send(API_STATUS_CODE.okData(true))
})

module.exports = {
  API: api,
}
