import type { tasksModel } from '../../db'
import { db } from '../../db'
import type { ChildProcess } from 'node:child_process'
import { logger } from '../../utils/logger'
import { randomString } from '../../utils'
import { execShell } from '../../utils/cmdUtil'
import { APP_ROOT_DIR } from '../type'
import { emitTaskCompleted, emitTaskStarted } from '../../server/socket'
import { notifyTaskFailure } from '../message/task'
import { persistTaskExecution } from './stats'

export interface taskRunInfo {
  startTime: number
  endTime: number
  duration: number
  success: boolean
  manual: boolean
  task: Pick<tasksModel, 'id' | 'name' | 'type' | 'error_notify' | 'error_alert'>
}

/**
 * 任务高级配置（从 task.config JSON 解析）
 */
export interface CronTaskConfig {
  allow_concurrency: boolean
  before_task_shell: string
  after_task_shell: string
}

/**
 * 解析任务高级配置
 */
export function parseTaskConfig(configStr: string | null | undefined): CronTaskConfig {
  const result: CronTaskConfig = {
    allow_concurrency: false,
    before_task_shell: '',
    after_task_shell: '',
  }
  if (!configStr) {
    return result
  }
  try {
    const config = JSON.parse(configStr)
    if (typeof config.allow_concurrency === 'boolean') {
      result.allow_concurrency = config.allow_concurrency
    }
    if (typeof config.before_task_shell === 'string') {
      result.before_task_shell = config.before_task_shell
    }
    if (typeof config.after_task_shell === 'string') {
      result.after_task_shell = config.after_task_shell
    }
  }
  catch {}
  return result
}

/**
 * 运行中的任务实例
 */
interface RunningInstance {
  runId: string
  task: tasksModel
  child: ChildProcess | undefined
  startTime: number
}

const runInstances = new Map<number, Map<string, RunningInstance>>()

// 已注册实时日志监听器的任务实例集合（key: runId）
export const liveLogRegistered = new Set<string>()

/**
 * 检查指定任务是否正在运行
 */
export function isTaskRunning(taskId: number): boolean {
  const instances = runInstances.get(taskId)
  return !!instances && instances.size > 0
}

/**
 * 获取所有正在运行的任务实例列表
 */
export function getAllRunningInstances(): tasksModel[] {
  const result: tasksModel[] = []
  for (const instances of runInstances.values()) {
    for (const inst of instances.values()) {
      result.push(inst.task)
    }
  }
  return result
}

/**
 * 获取指定任务最新的运行实例（按启动时间最晚）
 */
export function getLatestRunningInstance(taskId: number): RunningInstance | undefined {
  const instances = runInstances.get(taskId)
  if (!instances || instances.size === 0) {
    return undefined
  }
  let latest: RunningInstance | undefined
  for (const inst of instances.values()) {
    if (!latest || inst.startTime > latest.startTime) {
      latest = inst
    }
  }
  return latest
}

/**
 * 定时任务回调内容
 *
 * @param {number} taskId
 * @param {boolean} manual - 是否为手动触发，手动触发时忽略禁用状态
 */
export async function runCronTask(taskId: number, manual: boolean = false) {
  try {
    const task = await db.tasks.$getById(taskId)
    // 删除不存在的定时任务
    if (!task) {
      try {
        await db.taskCore.$deleteById(`T_${taskId}`)
      }
      catch {}
      return
    }
    // logger.info('触发定时任务', task.shell)
    // 跳过禁用的任务
    if (!manual && task.active <= 0) {
      // logger.info("触发定时任务", task.shell, "（PASS，原因：已被禁用）")
      return
    }
    // 解析高级配置
    const config = parseTaskConfig(task.config)
    if (isTaskRunning(taskId) && !config.allow_concurrency) {
      // 跳过正在运行的任务
      // logger.info('触发定时任务', task.shell, '（PASS，原因：正在运行）')
      return
    }
    // 拼接运行前/后命令
    if (config.before_task_shell) {
      task.shell = `bash -c "cd ${APP_ROOT_DIR} ; ${config.before_task_shell}" ; ${task.shell}`
    }
    if (config.after_task_shell) {
      task.shell = `${task.shell} ; bash -c "cd ${APP_ROOT_DIR} ; ${config.after_task_shell}"`
    }

    const runId = randomString(16)
    const startTime = Date.now()
    const child = runTaskModel(task, runId, config.allow_concurrency, manual)

    // 注册到多实例运行表（仅当子进程成功创建时）
    if (child) {
      if (!runInstances.has(taskId)) {
        runInstances.set(taskId, new Map())
      }
      runInstances.get(taskId)!.set(runId, { runId, task, child, startTime })
    }

    return { runId, child }
  }
  catch (e) {
    logger.error(`定时任务 ${taskId} 运行异常`, e)
  }
}

/**
 * 终止运行中的任务（接口封装）
 *
 * @param {number} taskId
 */
export function stopCronTask(taskId: number) {
  const latest = getLatestRunningInstance(taskId)
  if (!latest) {
    return
  }

  const { runId, child } = latest
  if (!child) {
    return
  }
  let isExited = false
  let elapsedTime = 0

  child.kill('SIGTERM')
  child.once('exit', (_code: string, signal: string) => {
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      removeInstance(taskId, runId)
      isExited = true
      // logger.info(`定时任务 ${taskId} 已被终止`);
    }
  })
  const checkInterval = setInterval(() => {
    elapsedTime += 1000
    if (isExited) {
      clearInterval(checkInterval)
      return
    }
    if (elapsedTime >= 30000) {
      clearInterval(checkInterval)
      if (runInstances.get(taskId)?.has(runId)) {
        child.kill('SIGKILL') // 强制终止
        // logger.info(`定时任务 ${taskId} 已被强制终止`);
      }
    }
  }, 1000) // 每秒检查一次
}

/**
 * 从运行注册表中移除指定实例
 */
function removeInstance(taskId: number, runId: string) {
  const instances = runInstances.get(taskId)
  if (instances) {
    instances.delete(runId)
    if (instances.size === 0) {
      runInstances.delete(taskId)
    }
  }
}

/**
 * 执行定时任务的命令
 */
function runTaskModel(
  task: tasksModel,
  runId: string,
  allowConcurrency: boolean,
  manual: boolean,
) {
  const startTime = Date.now()

  emitTaskStarted(task, manual)

  return execShell(task.shell, {
    callback: (error, stdout, _stderr) => {
      if (error) {
        logger.warn(`定时任务 "${task.name}" 执行异常`, error.toString().substring(stdout.length - 1000))
      }
    },
    onExit: (code) => {
      const endTime = new Date().getTime()
      const duration = endTime - startTime
      const success = code === 0 || code === null
      const info: taskRunInfo = { task, startTime, endTime, duration, success, manual }

      try {
        cleanupRunningTaskState(task, runId, startTime, duration, allowConcurrency)
      }
      catch (e) {
        logger.error(`清理任务运行状态异常 (task: ${task.name})`, e)
      }
      emitTaskCompleted(info)
      persistTaskExecution(task, duration, success).catch((e) =>
        logger.error('持久化任务执行记录异常', e))
      if (!success) {
        notifyTaskFailure(info).catch((e) =>
          logger.error('发送任务失败通知异常', e))
      }
    },
  })
}

/**
 * 清理任务运行状态并更新最后运行时间
 */
function cleanupRunningTaskState(
  task: tasksModel,
  runId: string,
  startTime: number,
  duration: number,
  allowConcurrency: boolean,
) {
  const data = {
    last_runtime: new Date(startTime),
    last_run_use: duration / 1000,
  }

  // 先从内存中清除
  removeInstance(task.id, runId)

  if (allowConcurrency) {
    // 并发场景：需要比较时间戳避免覆盖更新的运行记录
    db.tasks.$getById(task.id).then((t: tasksModel) => {
      if (!t.last_runtime || t.last_runtime.getTime() <= startTime) {
        db.tasks.$updateById({ id: t.id, data }).catch((_e) => {})
      }
    }).catch((_e) => {})
  }
  else {
    db.tasks.$updateById({ id: task.id, data }).catch((_e) => {})
  }
}
