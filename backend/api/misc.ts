import type { Express } from 'express'
import express from 'express'
import { logger } from '../utils/logger'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { randomString } from '../utils'
import svgCaptcha from 'svg-captcha'
import { exec } from 'node:child_process'
import { socketCommon } from '../server/socket'
import { getNeatContent } from '../server/fileCore'
import { APP_ROOT_DIR } from '../core/type'
import { setCaptcha, shouldShowCaptcha } from '../core/config/session'

const api: Express = express()
const taskRunning = {}

/**
 * 登录是否显示验证码
 */
api.get('/captcha/flag', async (_request, response) => {
  response.send(API_STATUS_CODE.okData({ showCaptcha: shouldShowCaptcha() }))
})

/**
 * 验证码
 */
api.get('/captcha', async (req, res) => {
  const { w = 120, h = 50, background = '#ffffff' } = req.query
  const options = {
    noise: 2,
    width: Number.parseInt(w as string),
    height: Number.parseInt(h as string),
    color: true,
    size: 5,
    ignoreChars: '0oO1iIltjc',
    background: background as string,
  }
  const captcha = svgCaptcha.create(options)
  const captchaText = captcha.text.toLowerCase() // 小写
  setCaptcha(captchaText) // 存储当前验证码
  res.type('svg')
  res.status(200).send(captcha.data)
})

/**
 * 调用命令执行
 */
api.post('/runCmd', (request, response) => {
  const cmd = `cd ${APP_ROOT_DIR} ; ${request.body.cmd}`
  const name = 'runLog'
  const runId = randomString(16)
  try {
    const result = exec(cmd, { shell: '/bin/bash', encoding: 'utf-8' })
    result.stdout?.on('data', (data) => {
      taskRunning[runId] = true
      socketCommon.emit(name, API_STATUS_CODE.okData({
        runId,
        log: getNeatContent(data),
        over: false,
      }))
    })
    result.stderr?.on('data', (data) => {
      if (taskRunning[runId]) {
        delete taskRunning[runId]
      }
      socketCommon.emit(name, API_STATUS_CODE.failData('run fail', {
        runId,
        log: getNeatContent(data),
        over: false,
      }))
    })
    result.on('exit', (_code) => {
      if (taskRunning[runId]) {
        delete taskRunning[runId]
      }
      // 结束
      socketCommon.emit(name, API_STATUS_CODE.ok('run over', {
        runId,
        over: true,
      }))
    })
  }
  catch (err) {
    logger.error(err)
  }
  response.send(API_STATUS_CODE.okData(runId))
})

/**
 * 查询调用命令任务的状态
 */
api.get('/runCmdStatus', (request, response) => {
  const id = request.query.id as string
  try {
    if (taskRunning[id]) {
      response.send(API_STATUS_CODE.okData(true))
    }
    else {
      response.send(API_STATUS_CODE.okData(false))
    }
  }
  catch {
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

export {
  api as API,
}
