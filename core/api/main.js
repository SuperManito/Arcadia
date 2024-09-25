const express = require('express')
const api = express()
const { logger } = require('../logger')
const { API_STATUS_CODE } = require('../http')

const random = require('string-random')
const svgCaptcha = require('svg-captcha')
const { exec } = require('child_process')
const socketCommon = require('../socket/common')
const { saveNewConf, getJsonFile, getNeatContent } = require('../file')
const { APP_ROOT_DIR, APP_FILE_TYPE } = require('../type')
const taskRunning = {}
const errorCount = 1

/**
 * 登录是否显示验证码
 */
api.get('/captcha/flag', (request, response) => {
  const con = getJsonFile(APP_FILE_TYPE.AUTH)
  const authErrorCount = con.authErrorCount || 0
  response.send(API_STATUS_CODE.okData({ showCaptcha: authErrorCount >= errorCount }))
})

/**
 * 验证码
 */
api.get('/captcha', (req, res) => {
  const { w = 120, h = 50, background = '#ffffff' } = req.query
  const options = {
    noise: 2,
    width: w,
    height: h,
    color: true,
    size: 5,
    ignoreChars: '0oO1iIltjc',
    background,
  }
  const captcha = svgCaptcha.create(options)
  const con = getJsonFile(APP_FILE_TYPE.AUTH)
  con.captcha = captcha.text.toLowerCase() // 小写
  saveNewConf(APP_FILE_TYPE.AUTH, con, false)
  res.type('svg')
  res.status(200).send(captcha.data)
})

/**
 * 调用命令执行
 */
api.post('/runCmd', (request, response) => {
  const cmd = `cd ${APP_ROOT_DIR};${request.body.cmd}`
  const name = 'runLog'
  const runId = random(16)
  try {
    const result = exec(cmd, { encoding: 'utf-8' })
    result.stdout.on('data', (data) => {
      taskRunning[runId] = true
      socketCommon.emit(name, API_STATUS_CODE.okData({
        runId, log: getNeatContent(data), over: false,
      }))
    })
    result.stderr.on('data', (data) => {
      if (taskRunning[runId]) {
        delete taskRunning[runId]
      }
      socketCommon.emit(name, API_STATUS_CODE.failData('run fail', {
        runId, log: getNeatContent(data), over: false,
      }))
    })
    result.on('exit', (_code) => {
      if (taskRunning[runId]) {
        delete taskRunning[runId]
      }
      // 结束
      socketCommon.emit(name, API_STATUS_CODE.ok('run over', {
        runId, over: true,
      }))
    })
  } catch (err) {
    logger.error(err)
  }
  response.send(API_STATUS_CODE.okData(runId))
})

/**
 * 查询调用命令任务的状态
 */
api.get('/runCmdStatus', (request, response) => {
  const id = request.query.id
  try {
    if (taskRunning[id]) {
      response.send(API_STATUS_CODE.okData(true))
    } else {
      response.send(API_STATUS_CODE.okData(false))
    }
  } catch (err) {
    response.send(API_STATUS_CODE.okData(false))
  }
})

/**
 * 停止任务
 */
api.post('/stopTask', (request, response) => {
  const cmd = `cd ${APP_ROOT_DIR}; arcadia stop ${request.body.path}`
  // console.log('before exec');
  // exec maxBuffer 20MB
  exec(cmd, {
    maxBuffer: 1024 * 1024 * 20,
  }, (error, stdout, stderr) => {
    // console.log(error, stdout, stderr);
    if (error) {
      console.error(`执行的错误: ${error}`)
      response.send(API_STATUS_CODE.okData(stdout ? `${stdout}${error}` : `${error}`))
      return
    }

    if (stdout) {
      // console.log(`stdout: ${stdout}`)
      response.send(API_STATUS_CODE.okData(getNeatContent(`${stdout}`)))
      return
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`)
      response.send(API_STATUS_CODE.okData(stderr))
      return
    }
    response.send(API_STATUS_CODE.okData('执行结束，无结果返回。'))
  })
})

module.exports = {
  API: api,
}
