import type { Express, Request, RequestHandler } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { logger } from '../utils/logger'
import fs from 'node:fs'
import { APP_FILE_PATH } from '../core/type'
import { hasPermission, resolveRoutePermission, verifyToken } from './openApi'

const api: Express = express()

// 加载用户自定义接口
const extraServer = APP_FILE_PATH.EXTRA_SERVER
if (fs.existsSync(extraServer)) {
  (async () => {
    try {
      // 动态导入模块
      const extraApi = await import(extraServer)
      // 检查是否导出了默认函数
      if (typeof extraApi.default === 'function') {
        extraApi.default(api, API_STATUS_CODE, logger)
        logger.info('用户 OpenAPI 自定义模块初始化成功')
      }
      else {
        logger.error('用户 OpenAPI 自定义模块初始化失败（未导出函数）')
      }
    }
    catch (e: any) {
      logger.error(`用户 OpenAPI 自定义模块初始化失败（${JSON.stringify(e.message || e)}）`)
    }
  })()
}

/**
 * 鉴权
 */
async function tokenChecker(req: Request) {
  try {
    // 从 Header 和 URL 参数中提取 Token
    let token = req.headers['api-token']
    if (!token || token === '') {
      token = req.query['api-token'] as string
    }
    if (!token || typeof token !== 'string') {
      return API_STATUS_CODE.OPEN_API.NO_AUTH
    }
    const record = await verifyToken(token)
    if (record) {
      // 细粒度权限校验
      const requiredPermission = resolveRoutePermission(req.method, req.path)
      if (requiredPermission && !hasPermission(record, requiredPermission)) {
        return API_STATUS_CODE.OPEN_API.PERMISSION_DENIED
      }
      return null // 认证通过
    }
  }
  catch (e) {
    logger.error(`OpenAPI 认证失败：${JSON.stringify(e instanceof Error ? e.message : e)}`)
  }
  return API_STATUS_CODE.OPEN_API.AUTH_FAIL
}

const OpenAPIAuthentication: RequestHandler = async (req, res, next) => {
  const failResult = await tokenChecker(req)
  if (failResult) {
    res.send(API_STATUS_CODE.fail(failResult.message, failResult.code))
  }
  else {
    next()
  }
}

export {
  OpenAPIAuthentication,
  api as OpenAPIExtra,
}
