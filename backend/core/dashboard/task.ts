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

// 全局内存统计对象
let memoryStats: DashboardMemoryStats | null = null

/**
 * 初始化监控系统
 */
export function initTaskMonitor() {
  logger.info('[定时任务监控] 初始化监控系统')
  // 初始化内存统计
  resetMemoryStats()
  // 监听任务事件
  taskEvents.on('task:completed', onTaskCompleted)
  // 定时清理过期数据（每天凌晨3点）
  scheduleCleanup()

  logger.info('[定时任务监控] 初始化完成')
}

/**
 * 重置内存统计数据
 */
function resetMemoryStats() {
  const now = Date.now()
  const date = new Date(now)
  const todayTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  memoryStats = {
    today: {
      date: todayTimestamp,
      execCount: 0,
      successCount: 0,
      failureCount: 0,
      totalDuration: 0,
    },
    lastCleanupTime: now,
  }
}

/**
 * 任务完成事件处理
 */
function onTaskCompleted(data: { taskId: number, duration: number, success: boolean, task?: tasksModel }) {
  if (!memoryStats)
    return

  const { duration, success, task } = data

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
  try {
    // 获取执行时间戳（秒级精度，转换为13位毫秒）
    const now = new Date()
    const execTimestamp = Math.floor(now.getTime() / 1000) * 1000

    // 格式化 duration：小于1秒为0，大于等于1秒四舍五入为整数
    const formattedDuration = duration < 1 ? 0 : Math.round(duration)

    // 插入单条执行记录
    await db.tasksExecutionStats.create({
      data: {
        task_id: task.id,
        task_name: task.name,
        task_type: task.type,
        exec_timestamp: execTimestamp,
        duration: formattedDuration,
        success: success ? 1 : 0,
      },
    })
  }
  catch (error) {
    logger.warn(`[定时任务监控] 任务执行记录持久化失败 taskId=${task.id}`, error)
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

  setTimeout(() => {
    cleanupOldData()
    // 递归设置下一次清理
    setInterval(cleanupOldData, 24 * 60 * 60 * 1000)
  }, delay)
}

/**
 * 执行数据清理
 */
async function cleanupOldData() {
  try {
    // 读取配置中的保留天数，默认7天
    let retentionDays = 7
    try {
      const days = await getUserConfigValue(ConfigKeyUser.CRON_TASK_HISTORY_DAYS)
      if (days) {
        retentionDays = Number.parseInt(days, 10)
      }
    }
    catch {}

    // 计算清理截止时间戳
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffTimestamp = cutoffDate.getTime()

    // 删除超过保留期的数据
    const result = await db.tasksExecutionStats.deleteMany({
      where: {
        exec_timestamp: {
          lt: cutoffTimestamp,
        },
      },
    })

    logger.info(`[定时任务监控] 数据清理完成，删除 ${result.count} 条记录，保留期：${retentionDays} 天`)
    if (memoryStats) {
      memoryStats.lastCleanupTime = Date.now()
    }
  }
  catch (error) {
    logger.error('[定时任务监控] 数据清理异常', error)
  }
}

/**
 * 获取今日统计摘要
 */
export function getTodayStatsSummary() {
  if (!memoryStats)
    return null

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
}
