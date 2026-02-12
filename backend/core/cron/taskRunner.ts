import type { tasksModel } from '../../db'
import { db } from '../../db'
import type { ChildProcess } from 'node:child_process'
import { logger } from '../../utils/logger'
import { execShell } from '../../utils/cmdUtil'

export interface taskRunInfo {
  startTime: number
  endTime: number
  duration: number
  success: boolean
  task: tasksModel
}

export const runningTasks: { [key: string]: tasksModel } = {} // 正在运行的任务信息
export const runningInstance: { [key: string]: ChildProcess | undefined } = {} // 正在运行的任务实例（child_process）

const beforeTaskRun: Array<{ order: number, fn: (task: tasksModel) => any }> = []
const afterTaskRun: Array<{ order: number, fn: (info: taskRunInfo) => any }> = []

/**
 * 添加任务执行前的回调函数
 * @param fn
 * @param order 优先级, 越小越先执行
 */
export function addBeforeTaskRun(fn: (task: tasksModel) => any, order: number = 100) {
  beforeTaskRun.push({ fn, order })
  beforeTaskRun.sort((a, b) => a.order - b.order)
}

/**
 * 添加任务执行后的回调函数
 * @param fn
 * @param order 优先级, 越小越先执行
 */
export function addAfterTaskRun(fn: (info: taskRunInfo) => any, order: number = 100) {
  afterTaskRun.push({ fn, order })
  afterTaskRun.sort((a, b) => a.order - b.order)
}

/**
 * 定时任务回调内容
 *
 * @param {number} taskId
 * @param {boolean} manual - 是否为手动触发，手动触发时忽略禁用状态
 */
export async function runCronTask(taskId: number, manual: boolean = false) {
  const task = await db.tasks.$getById(taskId)
  // 删除不存在的定时任务
  if (!task) {
    await db.taskCore.$deleteById(`T_${taskId}`)
    return
  }
  // logger.log('触发定时任务', task.shell)
  // 跳过禁用的任务
  if (!manual && task.active <= 0) {
    // logger.log("触发定时任务", task.shell, "（PASS，原因：已被禁用）")
    return
  }
  // 解析高级配置中的 allow_concurrency 字段
  let allow_concurrency = false // 默认不允许并发
  if (task.config) {
    try {
      const config = JSON.parse(task.config)
      if (typeof config.allow_concurrency === 'boolean') {
        allow_concurrency = config.allow_concurrency
      }
    }
    catch {}
  }
  if (runningTasks[taskId] && !allow_concurrency) {
    // 跳过正在运行的任务
    // logger.log('触发定时任务', task.shell, '（PASS，原因：正在运行）')
    return
  }
  runningTasks[taskId] = task // 将任务添加到正在运行的列表
  runningInstance[taskId] = runTaskModel(task)
  return runningInstance[taskId]
}

/**
 * 终止运行中的任务（接口封装）
 *
 * @param {number} taskId
 */
export function stopCronTask(taskId: number) {
  const task = runningInstance[taskId]
  if (task) {
    let isExited = false
    let elapsedTime = 0

    task.kill('SIGTERM')
    task.once('exit', (_code: string, signal: string) => {
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        delete runningInstance[taskId]
        isExited = true
        // logger.log(`定时任务 ${taskId} 已被终止`);
      }
    })
    const checkInterval = setInterval(() => {
      elapsedTime += 1000
      if (isExited || elapsedTime >= 30000) {
        clearInterval(checkInterval) // 清除定时器（已终止或超时）
      }
      else if (runningInstance[taskId]) {
        task.kill('SIGKILL') // 强制终止
        // logger.log(`定时任务 ${taskId} 已被强制终止`);
      }
    }, 1000) // 每秒检查一次
  }
}

/**
 * 执行定时任务的命令
 *
 */
function runTaskModel(task: tasksModel) {
  const startTime = Date.now()

  beforeTaskRun.forEach((f) => f.fn(task))
  return execShell(task.shell, {
    callback: (error, stdout, _stderr) => {
      // 任务回调
      if (error) {
        logger.warn(`定时任务 "${task.shell}" 执行异常`, error.toString().substring(stdout.length - 1000))
      }
      const callback = (task as any).onShellCallback
      let callbacks: any[] = (task as any).onShellCallbacks
      if (callback || callbacks) {
        if (!callbacks) {
          callbacks = []
        }
        if (callback) {
          callbacks.push(callback)
        }
        callbacks.forEach((fn) => {
          if (typeof fn === 'function') {
            fn(task, error, stdout)
          }
        })
      }
    },
    onExit: (code) => {
      // logger.log(`定时任务 ${taskId} 运行完毕`)
      const endTime = new Date().getTime()
      const duration = endTime - startTime
      const success = code === 0 || code === null
      afterTaskRun.forEach((f) => f.fn({
        task,
        startTime,
        endTime,
        duration,
        success,
      }))
    },
  })
}
