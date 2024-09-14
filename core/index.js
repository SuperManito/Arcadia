const random = require('string-random')
const { getJsonFile, saveNewConf } = require('./file')
const { APP_FILE_TYPE } = require('./type')
const utils = require('./utils')
const errorCount = 1

/**
 * 初始化
 */
function init() {
  const authFileJson = getJsonFile(APP_FILE_TYPE.AUTH)
  if (!utils.isNotEmpty(authFileJson.openApiToken)) {
    authFileJson.openApiToken = random(32)
  }

  if (!utils.isNotEmpty(authFileJson.jwtSecret)) {
    authFileJson.jwtSecret = random(16)
  }
  saveNewConf(APP_FILE_TYPE.AUTH, authFileJson, true)
}

init()

module.exports = {
  errorCount,
}
