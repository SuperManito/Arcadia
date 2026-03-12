import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import type { loginLogWhereInput, serverLogWhereInput } from '../db'
import db from '../db'
import { cleanLoginLogs, cleanServerLogs } from '../core/log'

const api: Express = express()
const apiInner: Express = express()

/**
 * 操作日志分页查询
 */
api.get('/server', async (request, response) => {
  try {
    const where: serverLogWhereInput = {}
    const and: serverLogWhereInput[] = []
    // 类型过滤
    const types = request.query.type ? (request.query.type as string).split(',') : []
    if (types.length > 0) {
      and.push({ OR: types.map(t => ({ type: { equals: t } })) })
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      and.push({ content: { contains: search } })
    }
    if (and.length > 0) {
      where.AND = and
    }
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await db.serverLog.$page({
      where,
      orderBy: { time: desc ? 'desc' : 'asc' },
      page: String(request.query.page),
      size: String(request.query.size),
    })
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
  try {
    const results = request.query.result ? (request.query.result as string).split(',') : []
    const where: loginLogWhereInput = {}
    if (results.length > 0) {
      where.OR = results.map(r => ({ result: { equals: Number(r) } }))
    }
    // 排序
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await db.loginLog.$page({
      where,
      orderBy: { time: desc ? 'desc' : 'asc' },
      page: String(request.query.page),
      size: String(request.query.size),
    })
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
