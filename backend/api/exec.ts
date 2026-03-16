import type { Express, Request, Response } from 'express'
import express from 'express'
import { execFile } from 'node:child_process'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { randomString, validateObject, validateRequestParams } from '../utils'
import { validateEnvName } from '../utils/envUtil'
import { socketCommon } from '../server/socket'
import {
  checkPathAccess,
  checkPathBoundary,
  cleanDebugTempFile,
  createDebugTempFile,
  getNeatContent,
} from '../server/fileCore'
import { APP_ROOT_DIR } from '../core/type'
import { CLI_CMD } from '../core/type/cli'
import { runCodeFile, runningExecTasks, runShellCmd } from '../core/runner'
import type { RunEnv, RunOption } from '../core/runner'
import { createSession } from 'better-sse'

const api: Express = express()
const apiOpen: Express = express()

/**
 * 查询运行状态
 *
 * 运行中: { running: true, startedAt: Date }
 * 已结束或未找到: { running: false }
 */
function execStatusHandler(request: Request, response: Response) {
  try {
    const id = request.query.id as string
    if (id && id in runningExecTasks) {
      response.send(API_STATUS_CODE.okData({ running: true, startedAt: runningExecTasks[id].startedAt }))
    }
    else {
      response.send(API_STATUS_CODE.okData({ running: false }))
    }
  }
  catch {
    response.send(API_STATUS_CODE.okData({ running: false }))
  }
}

/**
 * 停止运行中的任务（按代码文件路径）
 */
function execFileStopHandler(request: Request, response: Response) {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['path', [true, 'string']],
      ] as const,
    })
    const { path } = params.body
    checkPathBoundary(path) // 注：不能强制检查文件是否存在，前端可能传入的是相对路径
    execFile(
      'bash',
      ['-c', `cd ${APP_ROOT_DIR}; ${CLI_CMD.STOP} "$1"`, '--', path],
      { maxBuffer: 1024 * 1024 * 20 },
      (error, stdout, stderr) => {
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
      },
    )
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
}

/**
 * 解析并校验请求体中的命令选项数组
 */
function parseOptions(raw: RunOption[]): RunOption[] {
  if (!Array.isArray(raw))
    return []
  return raw
    .filter((item) => item != null && typeof item === 'object')
    .map((item) => {
      validateObject(item, [['key', [true, 'string']], ['value', [false, 'string']]], 'options')
      const key = item.key as string
      return { key, value: item.value != null ? String(item.value) : undefined }
    })
}

/**
 * 解析并校验请求体中的环境变量数组
 */
function parseEnvs(raw: RunEnv[]): RunEnv[] {
  if (!Array.isArray(raw))
    return []
  return raw
    .filter((item) => item != null && typeof item === 'object')
    .map((item) => {
      validateObject(item, [['key', [true, 'string']], ['value', [false, 'string']]], 'envs')
      const key = item.key as string
      validateEnvName(key)
      return { key, value: item.value != null ? String(item.value) : undefined }
    })
}

/**
 * 构造 runLog Socket 事件回调
 *
 * @param silent 为 true 时跳过 Socket 推送（OpenAPI 专用：调用方无 WebSocket 连接，推送无意义）
 */
function makeRunCallbacks(silent = false) {
  const name = 'runLog'
  return {
    onStdout(runId: string, data: string) {
      if (!silent) {
        socketCommon.emit(name, API_STATUS_CODE.okData({ runId, log: data, over: false }))
      }
    },
    onStderr(runId: string, data: string) {
      if (!silent) {
        socketCommon.emit(name, API_STATUS_CODE.failData('error output', { runId, log: data, over: false }))
      }
    },
    onError(runId: string, err: Error) {
      if (!silent) {
        socketCommon.emit(name, API_STATUS_CODE.failData('run fail', { runId, log: err.message, over: true }))
      }
    },
    onExit(runId: string) {
      if (!silent) {
        socketCommon.emit(name, API_STATUS_CODE.ok('run over', { runId, over: true }))
      }
    },
  }
}

/**
 * 创建 SSE 会话
 */
async function createSseSession(request: Request, response: Response) {
  return createSession(request, response, {
    headers: { 'X-Accel-Buffering': 'no' },
    retry: null,
  })
}

/**
 * 执行 Shell 命令（返回 runId，日志通过 Socket 推送）
 */
api.post('/cmd', (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['cmd', [true, 'string']],
      ] as const,
    })
    const { cmd } = params.body
    const runId = runShellCmd(cmd, makeRunCallbacks())
    response.send(API_STATUS_CODE.okData(runId))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 执行 Shell 命令（OpenAPI，返回 runId，无 Socket 推送）
 */
apiOpen.post('/v1/cmd', (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['cmd', [true, 'string']],
      ] as const,
    })
    const runId = runShellCmd(params.body.cmd, makeRunCallbacks(true))
    response.send(API_STATUS_CODE.okData(runId))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 查询运行状态
 */
api.get('/status', execStatusHandler)
apiOpen.get('/v1/status', execStatusHandler)

/**
 * 运行代码文件
 */
api.post('/file', (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['path', [true, 'string']],
        ['options', [false, 'object']],
        ['envs', [false, 'object']],
      ] as const,
    })
    const { path } = params.body
    checkPathAccess(path)
    const options = parseOptions(request.body.options)
    const envs = parseEnvs(request.body.envs)
    const runId = runCodeFile(path, options, envs, makeRunCallbacks())
    response.send(API_STATUS_CODE.okData(runId))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 运行代码文件（OpenAPI，返回 runId，无 Socket 推送）
 */
apiOpen.post('/v1/run', (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['path', [true, 'string']],
        ['options', [false, 'object']],
        ['envs', [false, 'object']],
      ] as const,
    })
    const { path } = params.body
    checkPathAccess(path)
    const options = parseOptions(request.body.options)
    const envs = parseEnvs(request.body.envs)
    const runId = runCodeFile(path, options, envs, makeRunCallbacks(true))
    response.send(API_STATUS_CODE.okData(runId))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 运行代码文件（SSE 流式推送日志）
 */
apiOpen.post('/v1/runStream', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['path', [true, 'string']],
        ['options', [false, 'object']],
        ['envs', [false, 'object']],
      ] as const,
    })
    const { path } = params.body
    checkPathAccess(path)
    const options = parseOptions(request.body.options)
    const envs = parseEnvs(request.body.envs)

    const session = await createSseSession(request, response)
    try {
      const runId = runCodeFile(path, options, envs, {
        onStdout(_id, data) { session.push({ type: 'log', stream: 'stdout', log: data }) },
        onStderr(_id, data) { session.push({ type: 'log', stream: 'stderr', log: data }) },
        async onError(id, err) {
          session.push({ runId: id, type: 'error', log: err.message })
          response.end()
        },
        async onExit(_id) {
          session.push({ type: 'exit' })
          response.end()
        },
      })
      session.push({ runId, type: 'start' })
    }
    catch (e: any) {
      session.push({ type: 'error', log: e?.message || '执行失败' })
      response.end()
    }
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 执行 Shell 命令（SSE 流式推送日志）
 */
apiOpen.post('/v1/cmdStream', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['cmd', [true, 'string']],
      ] as const,
    })

    const session = await createSseSession(request, response)
    try {
      const runId = runShellCmd(params.body.cmd, {
        onStdout(_id, data) { session.push({ type: 'log', stream: 'stdout', log: data }) },
        onStderr(_id, data) { session.push({ type: 'log', stream: 'stderr', log: data }) },
        async onError(id, err) {
          session.push({ runId: id, type: 'error', log: err.message })
          response.end()
        },
        async onExit(_id) {
          session.push({ type: 'exit' })
          response.end()
        },
      })
      session.push({ runId, type: 'start' })
    }
    catch (e: any) {
      session.push({ type: 'error', log: e?.message || '执行失败' })
      response.end()
    }
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 调试运行代码文件（基于临时文件，不修改原始文件内容）
 */
api.post('/file/debug', (request, response) => {
  let tempFilePath = ''
  let cleaned = false
  function cleanup() {
    if (cleaned || !tempFilePath)
      return
    cleaned = true
    cleanDebugTempFile(tempFilePath)
  }
  try {
    const params = validateRequestParams(request, {
      body: [
        ['path', [true, 'string']],
        ['content', [true, 'string']],
        ['options', [false, 'object']],
        ['envs', [false, 'object']],
      ] as const,
    })
    const { path, content } = params.body
    checkPathAccess(path)
    const options = [{ key: '--no-log', value: '' }, ...parseOptions(request.body.options)]
    const envs = parseEnvs(request.body.envs)
    const runId = randomString(16)
    tempFilePath = createDebugTempFile(path, runId, content)
    const callbacks = makeRunCallbacks()
    runCodeFile(tempFilePath, options, envs, {
      ...callbacks,
      onError(id, err) {
        cleanup()
        callbacks.onError(id, err)
      },
      onExit(id) {
        cleanup()
        callbacks.onExit(id)
      },
    }, runId)
    response.send(API_STATUS_CODE.okData({ runId, tempFile: tempFilePath }))
  }
  catch (e: any) {
    cleanup()
    response.send(API_STATUS_CODE.fail(e?.message || '执行失败'))
  }
})

/**
 * 停止运行中的任务
 */
api.post('/file/stop', execFileStopHandler)
apiOpen.post('/v1/stopRun', execFileStopHandler)

export {
  api as API,
  apiOpen as OpenAPI,
}
