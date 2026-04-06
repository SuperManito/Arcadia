import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pm2 from 'pm2'
import { removeTask, setTask, validateCronExpression } from '../cron/engine'
import { buildEnvCmdStr, buildOptionsArgs } from '../runner'
import type { RunEnv, RunOption } from '../runner'
import { CLI_CMD } from '../type/cli'
import { APP_DIR_PATH } from '../type'
import db from '../../db'
import { logger } from '../../utils/logger'

/** PM2 系统保留进程名，不允许作为守护任务名 */
const PM2_SYSTEM_PROCESS_WHITELIST = ['arcadia_server', 'tgbot']

function pm2Connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err)
        reject(err)
      else resolve()
    })
  })
}

function pm2Describe(name: string): Promise<pm2.ProcessDescription[]> {
  return new Promise((resolve, reject) => {
    pm2.describe(name, (err, list) => {
      if (err)
        reject(err)
      else resolve(list || [])
    })
  })
}

function pm2Stop(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.stop(name, (err) => {
      if (err)
        reject(err)
      else resolve()
    })
  })
}

function pm2Restart(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err) => {
      if (err)
        reject(err)
      else resolve()
    })
  })
}

function pm2Delete(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.delete(name, (err) => {
      if (err)
        reject(err)
      else resolve()
    })
  })
}

function pm2Flush(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pm2.flush(name, (err) => {
      if (err)
        reject(err)
      else resolve()
    })
  })
}

/**
 * 带自动连接/断开的 PM2 操作封装
 */
async function withPm2<T>(fn: () => Promise<T>): Promise<T> {
  await pm2Connect()
  try {
    return await fn()
  }
  finally {
    pm2.disconnect()
  }
}

function formatMemoryStr(bytes?: number): string | undefined {
  if (!bytes)
    return undefined
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}

/** 构造守护任务的日志文件完整路径 */
export function getDaemonLogFilePath(task: { log_dir: string, log_name: string }): string {
  const logDir = task.log_dir || APP_DIR_PATH.LOG
  return path.join(logDir, `${task.log_name}.log`)
}

export function isSystemProcessName(name: string): boolean {
  return PM2_SYSTEM_PROCESS_WHITELIST.includes(name)
}

export async function checkNameAvailable(name: string, excludeId?: number): Promise<{ available: boolean, reason?: string }> {
  if (isSystemProcessName(name)) {
    return { available: false, reason: '该名称为系统保留进程名' }
  }
  const dbRecord = await db.daemonTask.findFirst({ where: { name } })
  if (dbRecord && dbRecord.id !== excludeId) {
    return { available: false, reason: '数据库中已存在同名任务' }
  }
  try {
    const list = await withPm2(() => pm2Describe(name))
    if (list.length > 0 && (!dbRecord || dbRecord.id !== excludeId)) {
      return { available: false, reason: 'PM2 中已存在同名进程' }
    }
  }
  catch {
    // PM2 不可用时忽略
  }
  return { available: true }
}

export interface DaemonProcessStatus {
  status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'not-started'
  pid?: number
  pm_uptime?: number
  restart_time?: number
  memory?: string
}

export async function getProcessStatus(name: string): Promise<DaemonProcessStatus> {
  try {
    const list = await withPm2(() => pm2Describe(name))
    if (!list.length) {
      return { status: 'not-started' }
    }
    const proc = list[0]
    const env = proc.pm2_env as any
    return {
      status: (env?.status || 'not-started') as DaemonProcessStatus['status'],
      pid: proc.pid,
      pm_uptime: env?.pm_uptime,
      restart_time: env?.restart_time,
      memory: formatMemoryStr(proc.monit?.memory),
    }
  }
  catch {
    return { status: 'not-started' }
  }
}

export async function startDaemonTask(id: number): Promise<void> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')
  if (task.active !== 1)
    throw new Error('任务已禁用')

  // 启动前裁剪日志
  if (task.log_max_lines > 0 && task.log_name) {
    try {
      trimLogFile(getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name }), task.log_max_lines)
    }
    catch (e: any) {
      logger.warn(`守护任务 "${task.name}" 日志裁剪失败: ${e.message}`)
    }
  }

  // 解析 envs 和 options
  let envs: RunEnv[] = []
  let options: RunOption[] = []
  try {
    envs = JSON.parse(task.envs || '[]')
  }
  catch {}
  try {
    options = JSON.parse(task.options || '[]')
  }
  catch {}

  const args: string[] = [task.file_path]

  args.push('--name', task.name)

  if (task.max_restarts >= 0) {
    args.push('--max-restarts', String(task.max_restarts))
  }

  if (task.restart_delay > 0) {
    args.push('--restart-delay', String(task.restart_delay))
  }

  if (task.log_name) {
    const logDir = task.log_dir || APP_DIR_PATH.LOG
    args.push('--log-file', path.join(logDir, `${task.log_name}.log`))
  }

  if (task.restart_cron) {
    args.push('--restart-cron', task.restart_cron)
  }

  if (task.autorestart !== 1) {
    args.push('--no-autorestart')
  }

  if (task.max_memory_restart > 0) {
    args.push('--max-memory-restart', `${task.max_memory_restart}M`)
  }

  if (task.stop_exit_codes >= 0) {
    args.push('--stop-exit-codes', String(task.stop_exit_codes))
  }

  if (task.exp_backoff_restart_delay > 0) {
    args.push('--exp-backoff-restart-delay', String(task.exp_backoff_restart_delay))
  }

  // 环境变量（通过 envm edit 预设）
  const envCmdStr = buildEnvCmdStr(envs)

  // 命令选项
  const optionsArgs = buildOptionsArgs(options)
  args.push(...optionsArgs)

  const escapedArgs = args.map(a => `'${a.replace(/'/g, '\'\\\'\'')}'`).join(' ')

  // 先设置环境变量，再启动
  const fullCmd = envCmdStr
    ? `cd ${APP_DIR_PATH.ROOT} ; ${envCmdStr} >/dev/null 2>&1 ; ${CLI_CMD.RUND} ${escapedArgs}`
    : `cd ${APP_DIR_PATH.ROOT} ; ${CLI_CMD.RUND} ${escapedArgs}`

  return new Promise((resolve, reject) => {
    execFile('bash', ['-c', fullCmd], {
      cwd: APP_DIR_PATH.ROOT,
      timeout: 30000,
    }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
      }
      else {
        resolve()
      }
    })
  })
}

export async function stopDaemonTask(id: number): Promise<void> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')

  try {
    await withPm2(() => pm2Stop(task.name))
  }
  catch (err: any) {
    throw new Error(`停止失败: ${err.message || err}`)
  }
}

export async function restartDaemonTask(id: number): Promise<void> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')

  // 重启前裁剪日志
  if (task.log_max_lines > 0 && task.log_name) {
    try {
      trimLogFile(getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name }), task.log_max_lines)
    }
    catch (e: any) {
      logger.warn(`守护任务 "${task.name}" 日志裁剪失败: ${e.message}`)
    }
  }

  try {
    const list = await withPm2(() => pm2Describe(task.name))
    if (!list.length) {
      await startDaemonTask(id)
      return
    }
    await withPm2(() => pm2Restart(task.name))
  }
  catch {
    await startDaemonTask(id)
  }
}

export async function deleteDaemonTask(id: number): Promise<void> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')

  // 1. 从 PM2 中删除（忽略失败，进程可能不存在）
  try {
    await withPm2(() => pm2Delete(task.name))
  }
  catch {
    // 忽略
  }

  // 2. 删除 DB 记录
  await db.daemonTask.delete({ where: { id } })

  // 3. 清理定时重启 cron
  removeTask(`D_${id}`)
}

export async function flushDaemonTaskLog(id: number): Promise<void> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')

  await withPm2(() => pm2Flush(task.name))
}

export function trimLogFile(filePath: string, maxLines: number): void {
  if (!existsSync(filePath))
    return
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  if (lines.length <= maxLines)
    return
  const trimmed = lines.slice(lines.length - maxLines).join('\n')
  writeFileSync(filePath, trimmed, 'utf-8')
}

export async function trimDaemonTaskLog(id: number): Promise<void> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')
  if (!task.log_name)
    throw new Error('未配置日志文件')
  if (task.log_max_lines <= 0)
    throw new Error('未设置日志最大保留行数')

  trimLogFile(getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name }), task.log_max_lines)
}

export async function getDaemonTaskLog(id: number, startLine?: number): Promise<{ content: string, totalLines: number, nextStartLine: number }> {
  const task = await db.daemonTask.findFirst({ where: { id } })
  if (!task)
    throw new Error('任务不存在')
  if (!task.log_name)
    throw new Error('未配置日志文件')

  const filePath = getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name })
  if (!existsSync(filePath)) {
    return { content: '', totalLines: 0, nextStartLine: 0 }
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const totalLines = lines.length

  if (startLine && startLine > 0 && startLine < totalLines) {
    return {
      content: lines.slice(startLine).join('\n'),
      totalLines,
      nextStartLine: totalLines,
    }
  }

  return { content, totalLines, nextStartLine: totalLines }
}

/**
 * 后端启动时初始化守护任务
 * - 自动拉起 boot_start=1 且 active=1 的任务（PM2 中不存在时）
 * - 注册有 restart_cron 的定时重启
 */
export async function initDaemonTask(): Promise<void> {
  // 自启任务
  const bootTasks = await db.daemonTask.findMany({ where: { boot_start: 1, active: 1 } })
  for (const task of bootTasks) {
    try {
      const list = await withPm2(() => pm2Describe(task.name))
      if (!list.length) {
        await startDaemonTask(task.id)
          .catch(err => logger.warn(`守护任务 "${task.name}" 自启失败: ${err.message}`))
      }
    }
    catch {
      await startDaemonTask(task.id)
        .catch(err => logger.warn(`守护任务 "${task.name}" 自启失败: ${err.message}`))
    }
  }

  // 注册定时重启
  const cronTasks = await db.daemonTask.findMany({ where: { restart_cron: { not: '' }, active: 1 } })
  for (const task of cronTasks) {
    try {
      validateCronExpression(task.restart_cron)
      setTask(`D_${task.id}`, task.restart_cron, () => {
        restartDaemonTask(task.id)
          .catch(err => logger.warn(`守护任务 "${task.name}" 定时重启失败: ${err.message}`))
      })
    }
    catch (e: any) {
      logger.warn(`守护任务 "${task.name}" 定时重启表达式无效: ${e.message}`)
    }
  }

  logger.log('守护任务初始化完毕')
}

/**
 * 更新定时重启 cron（任务配置变更后调用）
 */
export function updateDaemonCron(taskId: number, cronExpression: string): void {
  removeTask(`D_${taskId}`)
  if (cronExpression) {
    try {
      validateCronExpression(cronExpression)
      setTask(`D_${taskId}`, cronExpression, () => {
        restartDaemonTask(taskId)
          .catch(err => logger.warn(`守护任务 ${taskId} 定时重启失败: ${err.message}`))
      })
    }
    catch {
      // 无效表达式，不注册
    }
  }
}
