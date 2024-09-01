const express = require('express')
const api = express()
const { API_STATUS_CODE } = require('../core/http')
const { logger } = require('../core/logger')

const fs = require('fs')
const util = require('../core/utils')
const { getJsonFile } = require('../core/file')
const { APP_FILE_TYPE, APP_FILE_PATH } = require('../core/type')

// 调用自定义接口
if (fs.existsSync(APP_FILE_PATH.EXTRA_SERVER)) {
  try {
    require.resolve(APP_FILE_PATH.EXTRA_SERVER)
    const extraApi = require(APP_FILE_PATH.EXTRA_SERVER)
    if (typeof extraApi === 'function') {
      extraApi(api, API_STATUS_CODE, logger)
      logger.info('用户 Open API 自定义模块初始化成功')
    } else {
      logger.error('用户 Open API 自定义模块初始化失败', '未导出函数')
    }
  } catch (e) {
    logger.error('用户 Open API 自定义模块初始化失败', e)
  }
}

module.exports.openAPI = api
module.exports.tokenChecker = function (req) {
  // open
  const authFileJson = getJsonFile(APP_FILE_TYPE.AUTH)
  let token = req.headers['api-token']
  if (!token || token === '') {
    // 取URL中的TOKEN
    token = req.query['api-token']
  }
  if (util.isNotEmpty(authFileJson.openApiToken)) {
    if (token && token !== '' && token === authFileJson.openApiToken) {
      return null
    } else {
      return API_STATUS_CODE.OPEN_API.AUTH_FAIL
    }
  } else {
    return API_STATUS_CODE.OPEN_API.NOT_OPEN
  }
}
module.exports.openApiHandler = function (req, res, next) {
  // open
  const fail = module.exports.tokenChecker(req)
  if (fail) {
    res.send(fail)
    return
  }
  next()
}
