import type { tasksModel } from '../../db'
import db from '../../db'
import { ConfigKeyUser } from '../type/config'
import { logger } from '../../utils/logger'
import { getUserConfigValue } from '../config'
import { taskEvents } from '../../server/events'

/**
 * 当前天的汇总统计
 */
interface TodayStats {
  date: number
  execCount: number
  successCount: number
  failureCount: number
  totalDuration: number
}

/**
 * 全局内存统计数据
 */
interface DashboardMemoryStats {
  today: TodayStats
  lastCleanupTime: number
}

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

// 全局内存统计对象
let memoryStats: DashboardMemoryStats | null = null

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
 * 获取今日零点时间戳
 */
function getTodayStartTimestamp(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/**
 * 初始化监控系统
 */
export async function initTaskMonitor() {
  // 初始化内存统计
  resetMemoryStats()

  // 从数据库恢复今日统计（处理重启场景）
  await recoverTodayStatsFromDB()

  // 监听任务事件
  taskEvents.on('task:completed', onTaskCompleted)

  // 定时清理过期数据（每天凌晨3点）
  scheduleCleanup()

  // 启动重试定时器
  startRetryTimer()
}

/**
 * 重置内存统计数据
 */
function resetMemoryStats() {
  memoryStats = {
    today: {
      date: getTodayStartTimestamp(),
      execCount: 0,
      successCount: 0,
      failureCount: 0,
      totalDuration: 0,
    },
    lastCleanupTime: Date.now(),
  }
}

/**
 * 从数据库恢复今日统计数据
 */
async function recoverTodayStatsFromDB() {
  try {
    const todayStart = getTodayStartTimestamp()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1

    const records = await db.tasksExecutionStats.findMany({
      where: {
        exec_timestamp: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    const execCount = records.length
    const successCount = records.filter(r => r.success === 1).length
    const failureCount = execCount - successCount
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0)

    if (memoryStats) {
      memoryStats.today = {
        date: todayStart,
        execCount,
        successCount,
        failureCount,
        totalDuration,
      }
    }
  }
  catch (error) {
    logger.error('[定时任务监控] 恢复今日统计失败', error)
  }
}

/**
 * 检查并处理跨天情况
 */
function checkAndResetIfNewDay(): boolean {
  if (!memoryStats)
    return false

  const todayStart = getTodayStartTimestamp()

  if (memoryStats.today.date !== todayStart) {
    resetMemoryStats()
    return true
  }

  return false
}

/**
 * 任务完成事件处理
 */
function onTaskCompleted(data: { taskId: number, duration: number, success: boolean, task?: tasksModel }) {
  if (!memoryStats)
    return

  const { duration, success, task } = data

  // 检查是否跨天
  checkAndResetIfNewDay()

  // 更新今日汇总统计
  memoryStats.today.execCount++
  memoryStats.today.totalDuration += duration
  if (success) {
    memoryStats.today.successCount++
  }
  else {
    memoryStats.today.failureCount++
  }

  // 立即持久化单条执行记录
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
 * 获取当前统计数据快照
 */
export function getMemoryStats() {
  if (!memoryStats) {
    resetMemoryStats()
  }
  return memoryStats!
}

/**
 * 定时清理（每天凌晨3点）
 */
function scheduleCleanup() {
  const now = new Date()
  const nextCleanup = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 3, 0, 0)
  const delay = nextCleanup.getTime() - now.getTime()

  cleanupTimer = setTimeout(() => {
    cleanupOldData()
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
    const cutoffTimestamp = cutoffDate.getTime()

    await db.tasksExecutionStats.deleteMany({
      where: {
        exec_timestamp: {
          lt: cutoffTimestamp,
        },
      },
    })

    if (memoryStats) {
      memoryStats.lastCleanupTime = Date.now()
    }
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
 * 获取今日统计摘要
 */
export function getTodayStatsSummary() {
  if (!memoryStats)
    return null

  // 获取统计前检查是否跨天
  checkAndResetIfNewDay()

  const { today } = memoryStats
  const successRate = today.execCount > 0
    ? Math.round((today.successCount / today.execCount) * 10000) / 100
    : 0
  const avgDuration = today.execCount > 0
    ? Math.round((today.totalDuration / today.execCount) * 100) / 100
    : 0

  return {
    execCount: today.execCount,
    successCount: today.successCount,
    failureCount: today.failureCount,
    successRate,
    avgDuration,
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
    cleanupTimer = null
  }

  if (pendingWrites.length > 0) {
    logger.warn(`[定时任务监控] 服务关闭时仍有 ${pendingWrites.length} 条记录未持久化`)
  }
}
