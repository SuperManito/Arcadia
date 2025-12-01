import express from 'express'
import type { Express, Request, RequestHandler } from 'express'
import { API_STATUS_CODE } from '../http'
import { logger } from '../logger'
import fs from 'node:fs'
import { isNotEmpty } from '../utils'
import configService from '../service/config'
import { APP_FILE_PATH } from '../type'
import { DEFAULT_CONFIGS, ModuleEnum } from '../type/config'
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
    if (!token) {
      return API_STATUS_CODE.OPEN_API.NO_AUTH
    }
    // 后面得引入缓存
    const openApiToken = await configService.getConfigValueByKeyAndModule(DEFAULT_CONFIGS.SYSTEM.openApiToken.key, ModuleEnum.SYSTEM)
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
