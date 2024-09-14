const childProcess = require('child_process')
const { APP_FILE_PATH } = require('../type')

/**
 * @param filePath 文件路径
 * @returns null|ScriptInfo
 */
async function resolveScript(filePath) {
  // 判断文件夹是否存在
  // 如果不存在,则创建,并从指定地址拉取
  /* eslint-disable no-promise-executor-return */
  return new Promise((resolve, reject) => childProcess.exec(`bash ${APP_FILE_PATH.RESOLVE_SCRIPT} ${filePath}`, (error, stdout, _stderr) => {
    if (error) {
      reject(error)
    } else {
      try {
        const text = stdout.split('\n').filter((it) => it.trim().length > 0)
        resolve(JSON.parse(text[text.length - 1]))
        // resolve(JSON.parse(stdout))
      } catch (e) {
        reject(e)
      }
    }
  }))
}

module.exports = resolveScript
