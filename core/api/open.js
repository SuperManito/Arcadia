const express = require('express')
const api = express()
const { API_STATUS_CODE } = require('../http')
const { logger } = require('../logger')

const fs = require('fs')
const util = require('../utils')
const { getJsonFile } = require('../file')
const { APP_FILE_TYPE, APP_FILE_PATH } = require('../type')

// 加载用户自定义接口
if (fs.existsSync(APP_FILE_PATH.EXTRA_SERVER)) {
  try {
    require.resolve(APP_FILE_PATH.EXTRA_SERVER)
    const extraApi = require(APP_FILE_PATH.EXTRA_SERVER)
    if (typeof extraApi === 'function') {
      extraApi(api, API_STATUS_CODE, logger)
      logger.info('用户 OpenAPI 自定义模块初始化成功')
    } else {
      logger.error('用户 OpenAPI 自定义模块初始化失败（未导出函数）')
    }
  } catch (e) {
    logger.error(`用户 OpenAPI 自定义模块初始化失败（${JSON.stringify(e.message || e)}）`)
  }
}

/**
 * 鉴权
 */
function tokenChecker(req) {
  try {
    // 从 Header 和 URL 参数中提取 Token
    let token = req.headers['api-token']
    if (!token || token === '') {
      token = req.query['api-token']
    }
    if (!token) {
      return API_STATUS_CODE.OPEN_API.NO_AUTH
    }
    const openApiToken = (getJsonFile(APP_FILE_TYPE.AUTH) || {})?.openApiToken
    if (!util.isNotEmpty(openApiToken)) {
      return API_STATUS_CODE.OPEN_API.AUTH_FAIL
    }
    if (token === openApiToken) {
      return null // 认证通过
    }
  } catch {}
  return API_STATUS_CODE.OPEN_API.AUTH_FAIL
}

function openApiMiddleware(req, res, next) {
  const failResult = tokenChecker(req)
  if (failResult) {
    return res.send(API_STATUS_CODE.fail(failResult.message, failResult.code))
  }
  next()
}

module.exports = {
  ExtraOpenAPI: api,
  openApiMiddleware,
}
