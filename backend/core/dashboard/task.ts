import type { tasksModel } from '../../db'
import db from '../../db'
import { ConfigKeyUser } from '../type/config'
import { logger } from '../../utils/logger'
import { getUserConfigValue } from '../config'
import { taskEvents } from '../../server/events'

/**
 * 持久化失败记录
 */
interface PendingRecord {
  task_id: number
  task_name: string
  task_type: string
  exec_timestamp: number
  duration: number
  success: number
  retryCount: number
}

// 持久化失败队列
const pendingWrites: PendingRecord[] = []
const MAX_RETRY_COUNT = 3
const RETRY_INTERVAL = 30000

// 定时器引用
let cleanupTimer: NodeJS.Timeout | null = null
let retryTimer: NodeJS.Timeout | null = null

/**
 * 获取对齐到秒的时间戳（13位毫秒格式）
 */
function getAlignedTimestamp(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000) * 1000
}

/**
 * 初始化监控系统
 */
export async function initTaskMonitor() {
  taskEvents.on('task:completed', onTaskCompleted)
  scheduleCleanup()
  startRetryTimer()
}

/**
 * 任务完成事件处理 - 持久化执行记录
 */
function onTaskCompleted(data: { taskId: number, duration: number, success: boolean, task?: tasksModel }) {
  const { duration, success, task } = data
  if (task) {
    persistTaskExecution(task, duration, success)
  }
}

/**
 * 持久化单条任务执行记录到数据库
 */
async function persistTaskExecution(task: tasksModel, duration: number, success: boolean) {
  const execTimestamp = getAlignedTimestamp()
  const formattedDuration = duration < 1 ? 0 : Math.round(duration)

  const record = {
    task_id: task.id,
    task_name: task.name,
    task_type: task.type,
    exec_timestamp: execTimestamp,
    duration: formattedDuration,
    success: success ? 1 : 0,
  }

  try {
    await db.tasksExecutionStats.create({ data: record })
  }
  catch (error) {
    logger.warn('[定时任务监控] 持久化失败，已加入重试队列', error)
    pendingWrites.push({ ...record, retryCount: 0 })
  }
}

/**
 * 定时清理（每天凌晨3点）
 */
function scheduleCleanup() {
  const now = new Date()
  const nextCleanup = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 3, 0, 0)
  const delay = nextCleanup.getTime() - now.getTime()

  cleanupTimer = setTimeout(async () => {
    await cleanupOldData()
    cleanupTimer = setInterval(cleanupOldData, 24 * 60 * 60 * 1000) as NodeJS.Timeout
  }, delay) as NodeJS.Timeout
}

/**
 * 执行数据清理
 */
async function cleanupOldData() {
  try {
    let retentionDays = 7
    try {
      const days = await getUserConfigValue(ConfigKeyUser.CRON_TASK_HISTORY_DAYS)
      if (days) {
        retentionDays = Number.parseInt(days, 10)
      }
    }
    catch {}

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    cutoffDate.setHours(0, 0, 0, 0) // 以保留天数的当天零点为边界，避免删除当天部分数据
    const cutoffTimestamp = cutoffDate.getTime()

    await db.tasksExecutionStats.deleteMany({
      where: {
        exec_timestamp: {
          lt: cutoffTimestamp,
        },
      },
    })
  }
  catch (error) {
    logger.error('[定时任务监控] 数据清理异常', error)
  }
}

/**
 * 启动失败记录重试定时器
 */
function startRetryTimer() {
  if (retryTimer) {
    clearInterval(retryTimer)
  }

  retryTimer = setInterval(async () => {
    if (pendingWrites.length === 0)
      return

    const batch = pendingWrites.splice(0, 100)
    const failed: PendingRecord[] = []

    for (const record of batch) {
      try {
        const { retryCount: _, ...data } = record
        await db.tasksExecutionStats.create({ data })
      }
      catch {
        record.retryCount++
        if (record.retryCount < MAX_RETRY_COUNT) {
          failed.push(record)
        }
        else {
          logger.error('[定时任务监控] 记录持久化失败超过重试次数，丢弃数据', {
            taskId: record.task_id,
            taskName: record.task_name,
          })
        }
      }
    }

    if (failed.length > 0) {
      pendingWrites.unshift(...failed)
    }
  }, RETRY_INTERVAL)
}

/**
 * 停止重试定时器
 */
function stopRetryTimer() {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
}

/**
 * 关闭监控系统
 */
export function closeDashboardMonitor() {
  taskEvents.off('task:completed', onTaskCompleted)
  stopRetryTimer()

  if (cleanupTimer) {
    clearTimeout(cleanupTimer)
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }

  if (pendingWrites.length > 0) {
    logger.warn(`[定时任务监控] 服务关闭时仍有 ${pendingWrites.length} 条记录未持久化`)
  }
}
