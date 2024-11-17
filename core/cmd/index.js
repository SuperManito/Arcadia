const { APP_ROOT_DIR } = require('../type')
const { exec } = require('node:child_process')

/**
 * 执行 Shell 命令
 *
 * @param {string} cmd
 * @param {{
 *   callback: (error:any,stdout:string,stderr:string)=>?,
 *   onChange: function(data:{},type:'stdout'|'stderr')?,
 *   onExit: function(code:number)?,
 *   onException: function(error)?
 * }?} config
 * @return {child_process.ChildProcess}
 */
function execShell(cmd, config) {
  try {
    const process = exec(`cd ${APP_ROOT_DIR} ; ${cmd}`, {
      encoding: 'utf8',
      shell: '/bin/bash',
      maxBuffer: 1024 * 1024 * 10, // 10M
    }, config.callback)
    if (config.onExit) {
      process.on('exit', config.onExit)
    }
    const onChange = config.onChange
    if (onChange) {
      process.stdout.on('data', (data) => onChange(data, 'stdout'))
      process.stderr.on('data', (data) => onChange(data, 'stderr'))
    }
    return process
  }
  catch (e) {
    try {
      config.onException && config.onException(e)
    }
    finally {
      config.onExit && config.onExit(1)
    }
  }
}

module.exports = {
  execShell,
}
