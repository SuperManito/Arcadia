import type { Express } from 'express'
import type {
  loginLogWhereInput,
  openApiLogWhereInput,
  serverLogWhereInput,
} from '../../db'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import db from '../../db'
import { validateRequestParams } from '../../utils'
import { CLEANUP_TYPES, runCleanup } from '../../core/cleanup'
import { clearLoginLogs, clearOpenApiLogs, clearServerLogs } from '../../core/log'

const api: Express = express()

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
 * 开放接口日志分页查询
 */
api.get('/openapi', async (request, response) => {
  try {
    const where: openApiLogWhereInput = {}
    // 请求方法过滤
    const methods = request.query.method ? (request.query.method as string).split(',') : []
    if (methods.length > 0) {
      where.OR = methods.map(m => ({ method: { equals: m.toUpperCase() } }))
    }
    // 排序
    let desc = true
    if (request.query.order === '0') {
      desc = false
    }
    const result = await db.openApiLog.$page({
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
 * 清理日志与数据值
 */
api.post('/cleanup', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['days', [false, 'number']],
        ['types', [false, 'string[]']],
      ] as const,
    })
    const { days, types } = params.body
    if (typeof days === 'number' && days <= 0) {
      response.send(API_STATUS_CODE.fail('参数 days 无效（参数值类型错误）'))
      return
    }
    if (types && types.some((t: any) => !CLEANUP_TYPES.includes(t))) {
      throw new Error('参数 types 无效（参数值类型错误）')
    }
    const result = await runCleanup(days ?? null, types as any)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '清理失败'))
  }
})

/**
 * 清空指定类型的系统日志
 */
api.delete('/clear', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['type', [true, ['server', 'login', 'openapi']]],
      ] as const,
    })
    const { type } = params.body
    const clearFunctions = {
      server: clearServerLogs,
      login: clearLoginLogs,
      openapi: clearOpenApiLogs,
    } as const
    const result = await clearFunctions[type]()
    response.send(API_STATUS_CODE.okData({ count: result.count }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '清空日志失败'))
  }
})

export const API = api
