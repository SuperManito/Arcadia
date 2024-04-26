const random = require('string-random')
const { CONFIG_FILE_KEY, getJsonFile, saveNewConf } = require('./file')
const utils = require('./utils')
const errorCount = 1

/**
 * 初始化
 */
function init() {
  const authFileJson = getJsonFile(CONFIG_FILE_KEY.AUTH)
  if (!utils.isNotEmpty(authFileJson.openApiToken)) {
    authFileJson.openApiToken = random(32)
  }

  if (!utils.isNotEmpty(authFileJson.jwtSecret)) {
    authFileJson.jwtSecret = random(16)
  }
  saveNewConf(CONFIG_FILE_KEY.AUTH, authFileJson, true)
}

init()

module.exports = {
  errorCount,
}
