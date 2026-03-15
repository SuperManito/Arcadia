import type { Express } from 'express'
import express from 'express'
import { logger } from '../utils/logger'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { randomString, validateRequestParams } from '../utils'
import svgCaptcha from 'svg-captcha'
import { exec, execFile } from 'node:child_process'
import { socketCommon } from '../server/socket'
import { canRunCodeFileExtList, checkPathAccess, cleanDebugTempFile, createDebugTempFile, getNeatContent } from '../server/fileCore'
import { APP_ROOT_DIR } from '../core/type'
import { setCaptcha, shouldShowCaptcha } from '../core/config/session'
import nodePath from 'node:path'

const api: Express = express()
const taskRunning = {}

/**
 * 登录是否显示验证码
 */
api.get('/captcha/flag', async (_request, response) => {
  try {
    response.send(API_STATUS_CODE.okData({ showCaptcha: shouldShowCaptcha() }))
  }
  catch (err) {
    logger.error('Error checking captcha flag:', err)
    response.send(API_STATUS_CODE.okData({ showCaptcha: false }))
  }
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
  try {
    const params = validateRequestParams(request, {
      body: [
        ['cmd', [true, 'string']],
      ] as const,
    })
    const { cmd: paramsCmd } = params.body
    const cmd = `cd ${APP_ROOT_DIR} ; ${paramsCmd}`
    const name = 'runLog'
    const runId = randomString(16)
    let runOverFlag = false // 防止推送2次结束事件
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
      socketCommon.emit(name, API_STATUS_CODE.failData('error output', {
        runId,
        log: getNeatContent(data),
        over: false,
      }))
    })
    result.on('error', (err) => {
      if (runOverFlag)
        return
      runOverFlag = true
      socketCommon.emit(name, API_STATUS_CODE.failData('run fail', {
        runId,
        log: err.message,
        over: true,
      }))
    })
    result.on('exit', (_code) => {
      if (runOverFlag)
        return
      runOverFlag = true
      if (taskRunning[runId]) {
        delete taskRunning[runId]
      }
      // 结束
      socketCommon.emit(name, API_STATUS_CODE.ok('run over', {
        runId,
        over: true,
      }))
    })
    response.send(API_STATUS_CODE.okData(runId))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 查询调用命令任务的状态
 */
api.get('/runCmdStatus', (request, response) => {
  try {
    const id = request.query.id as string
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
  try {
    const taskPath = String(request.body.path || '')
    if (!taskPath) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 path'))
      return
    }
    execFile('bash', ['-c', `cd ${APP_ROOT_DIR}; arcadia stop "$1"`, '--', taskPath], {
      maxBuffer: 1024 * 1024 * 20,
    }, (error, stdout, stderr) => {
      if (error) {
        response.send(API_STATUS_CODE.okData(stdout ? `${stdout}${error}` : `${error}`))
        return
      }

      if (stdout) {
        response.send(API_STATUS_CODE.okData(getNeatContent(`${stdout}`)))
        return
      }

      if (stderr) {
        response.send(API_STATUS_CODE.okData(stderr))
        return
      }
      response.send(API_STATUS_CODE.okData('执行结束，无结果返回。'))
    })
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 调试运行代码文件（使用临时文件执行，不保存原始文件内容）
 */
api.post('/debugRun', (request, response) => {
  let tempFilePath = ''
  let cleaned = false
  let runOverFlag = false // 防止推送2次结束事件
  function cleanup() {
    if (cleaned || !tempFilePath) {
      return
    }
    cleaned = true
    cleanDebugTempFile(tempFilePath)
  }

  try {
    const name = 'runLog'
    const params = validateRequestParams(request, {
      body: [
        ['path', [true, 'string']],
        ['content', [true, 'string']],
        ['option', [false, 'object']],
        ['env', [false, 'object']],
      ] as const,
    })
    const { path, content } = params.body
    checkPathAccess(path)
    // 检查文件类型
    const ext = nodePath.extname(path).slice(1)
    if (!canRunCodeFileExtList.includes(ext)) {
      response.send(API_STATUS_CODE.fail('不支持的文件类型'))
      return
    }
    const runId = randomString(16)
    tempFilePath = createDebugTempFile(path, runId, content)

    // 拼接命令选项
    const paramOption: ({ key: string, value: string })[] = Array.isArray(request.body.option) ? request.body.option : []
    const optionsArgs = ['--no-log', ...paramOption
      .filter(item => item.key)
      .flatMap(item => item.value ? [item.key, item.value] : [item.key])]

    // 拼接环境变量设置命令
    const paramEnv: ({ key: string, value: string })[] = Array.isArray(request.body.env) ? request.body.env : []
    const envCmdStr = paramEnv
      .filter(item => item.key)
      .map(item => `arcadia envm edit ${item.key} ${item.value || '\'\''}`)
      .join(' ; ')

    const baseCmd = `cd ${APP_ROOT_DIR} ; ${envCmdStr ? `${envCmdStr} >/dev/null 2>&1 ; ` : ''}arcadia run "$1" "\${@:2}"`

    const result = execFile('bash', ['-c', baseCmd, '--', tempFilePath, ...optionsArgs], { encoding: 'utf-8' })
    result.stdout?.on('data', (data) => {
      taskRunning[runId] = true
      socketCommon.emit(name, API_STATUS_CODE.okData({
        runId,
        log: getNeatContent(data),
        over: false,
      }))
    })
    result.stderr?.on('data', (data) => {
      socketCommon.emit(name, API_STATUS_CODE.failData('error output', {
        runId,
        log: getNeatContent(data),
        over: false,
      }))
    })
    result.on('error', (err) => {
      if (runOverFlag)
        return
      runOverFlag = true
      cleanup()
      socketCommon.emit(name, API_STATUS_CODE.failData('run fail', {
        runId,
        log: err.message,
        over: true,
      }))
    })
    result.on('exit', (_code) => {
      if (runOverFlag)
        return
      runOverFlag = true
      if (taskRunning[runId]) {
        delete taskRunning[runId]
      }
      cleanup()
      socketCommon.emit(name, API_STATUS_CODE.ok('run over', {
        runId,
        over: true,
      }))
    })
    response.send(API_STATUS_CODE.okData(runId))
  }
  catch (e: any) {
    cleanup()
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

export {
  api as API,
}
