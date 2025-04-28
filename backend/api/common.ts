import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../http'
const api: Express = express()

/**
 * 健康检测
 */
api.get('/health', async (_request, response) => {
  response.send(API_STATUS_CODE.okData(true))
})

export {
  api as API,
}
