import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { cleanLoginLogs, cleanServerLogs, getLoginLogs, getServerLogs } from '../core/log'

const api: Express = express()
const apiInner: Express = express()

/**
 * 操作日志分页查询
 */
api.get('/server', async (request, response) => {
  const { page = 1, size = 20, type, search } = request.query
  try {
    const result = await getServerLogs(Number(page), Number(size), type as string | undefined, search as string | undefined)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 登录日志分页查询
 */
api.get('/login', async (request, response) => {
  const { page = 1, size = 20 } = request.query
  try {
    const result = await getLoginLogs(Number(page), Number(size))
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 清理旧日志（内部接口）
 */
apiInner.post('/clean', async (request, response) => {
  const days = Number(request.body.days)
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < 1) {
    return response.send(API_STATUS_CODE.fail('days 必须为大于 0 的整数'))
  }
  try {
    const [serverResult, loginResult] = await Promise.all([
      cleanServerLogs(days),
      cleanLoginLogs(days),
    ])
    response.send(API_STATUS_CODE.okData({
      serverLog: serverResult.count,
      loginLog: loginResult.count,
    }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export {
  api as API,
  apiInner as InnerAPI,
}
