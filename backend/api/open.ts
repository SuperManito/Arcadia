import express from 'express'
import type { Express, Request, RequestHandler } from 'express'
import { API_STATUS_CODE } from '../http'
import { logger } from '../logger'
import fs from 'node:fs'
import { isNotEmpty } from '../utils'
import { getJsonFile } from '../file'
import { APP_FILE_PATH, APP_FILE_TYPE } from '../type'
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
function tokenChecker(req: Request) {
  try {
    // 从 Header 和 URL 参数中提取 Token
    let token = req.headers['api-token']
    if (!token || token === '') {
      token = req.query['api-token'] as string
    }
    if (!token) {
      return API_STATUS_CODE.OPEN_API.NO_AUTH
    }
    const openApiToken = (getJsonFile(APP_FILE_TYPE.AUTH) || {})?.openApiToken
    if (!isNotEmpty(openApiToken)) {
      return API_STATUS_CODE.OPEN_API.AUTH_FAIL
    }
    if (token === openApiToken) {
      return null // 认证通过
    }
  }
  catch {}
  return API_STATUS_CODE.OPEN_API.AUTH_FAIL
}

const OpenAPIAuthentication: RequestHandler = (req, res, next) => {
  const failResult = tokenChecker(req)
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
