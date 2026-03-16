import { exec, execFile } from 'node:child_process'
import { getNeatContent } from '../../server/fileCore'
import { randomString } from '../../utils'
import { APP_ROOT_DIR } from '../type'
import { CLI_CMD } from '../type/cli'

export interface ExecTaskInfo {
  startedAt: Date
}

/**
 * 正在运行中的任务（runId → 任务信息）
 */
export const runningExecTasks: Record<string, ExecTaskInfo> = {}

export interface RunOption {
  key: string
  value?: string
}

export interface RunEnv {
  key: string
  value?: string
}

export interface RunnerCallbacks {
  onStdout: (runId: string, data: string) => void
  onStderr: (runId: string, data: string) => void
  onError: (runId: string, err: Error) => void
  onExit: (runId: string) => void
}

/**
 * 构建命令选项参数数组
 */
export function buildOptionsArgs(options: RunOption[]): string[] {
  return options
    .filter(item => item.key)
    .flatMap(item => (item.value != null && item.value !== '') ? [item.key, item.value] : [item.key])
}

/**
 * 构建环境变量设置命令字符串
 */
export function buildEnvCmdStr(envs: RunEnv[]): string {
  return envs
    .filter(item => item.key)
    .map(item => `${CLI_CMD.ENVM_EDIT} ${item.key} '${(item.value ?? '').replace(/'/g, '\'\\\'\'')}'`)
    .join(' ; ')
}

/**
 * 执行 Shell 命令
 *
 * @param cmd 要执行的 shell 命令（原始命令，无需额外处理）
 * @param callbacks 各阶段回调
 * @returns 事件id（runId）
 */
export function runShellCmd(cmd: string, callbacks: RunnerCallbacks): string {
  const runId = randomString(16)
  const fullCmd = `cd ${APP_ROOT_DIR} ; ${cmd}`
  let done = false
  const child = exec(fullCmd, { shell: '/bin/bash', encoding: 'utf-8' })
  runningExecTasks[runId] = { startedAt: new Date() }
  child.stdout?.on('data', (data: string) => {
    callbacks.onStdout(runId, getNeatContent(data))
  })
  child.stderr?.on('data', (data: string) => {
    callbacks.onStderr(runId, getNeatContent(data))
  })
  child.on('error', (err) => {
    if (done)
      return
    done = true
    delete runningExecTasks[runId]
    callbacks.onError(runId, err)
  })
  child.on('exit', () => {
    if (done)
      return
    done = true
    delete runningExecTasks[runId]
    callbacks.onExit(runId)
  })

  return runId
}

/**
 * 运行代码文件
 *
 * @param filePath 要运行的代码文件路径
 * @param options 命令选项
 * @param envs 环境变量
 * @param callbacks 各阶段回调
 * @param preRunId 由调用方预先指定的 runId（用于调试临时文件与 runId 共享的场景）
 * @returns 事件id（runId）
 */
export function runCodeFile(
  filePath: string,
  options: RunOption[],
  envs: RunEnv[],
  callbacks: RunnerCallbacks,
  preRunId?: string,
): string {
  const runId = preRunId ?? randomString(16)
  const optionsArgs = buildOptionsArgs(options)
  const envCmdStr = buildEnvCmdStr(envs)
  const baseCmd = `cd ${APP_ROOT_DIR} ; ${envCmdStr ? `${envCmdStr} >/dev/null 2>&1 ; ` : ''}${CLI_CMD.RUN} "$1" "\${@:2}"`
  let done = false
  const child = execFile('bash', ['-c', baseCmd, '--', filePath, ...optionsArgs], { encoding: 'utf-8' })
  runningExecTasks[runId] = { startedAt: new Date() }

  child.stdout?.on('data', (data: string) => {
    callbacks.onStdout(runId, getNeatContent(data))
  })
  child.stderr?.on('data', (data: string) => {
    callbacks.onStderr(runId, getNeatContent(data))
  })
  child.on('error', (err) => {
    if (done)
      return
    done = true
    delete runningExecTasks[runId]
    callbacks.onError(runId, err)
  })
  child.on('exit', () => {
    if (done)
      return
    done = true
    delete runningExecTasks[runId]
    callbacks.onExit(runId)
  })
  return runId
}
