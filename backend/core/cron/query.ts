import db from '../../db'
import { logger } from '../../utils/logger'
import { getDateStr } from '../../utils'
import { getTodayStatsSummary } from '../dashboard/task'

type TaskType = 'all' | 'system' | 'user'

/**
 * 获取对齐到秒的时间戳（13位毫秒格式）
 */
function getAlignedTimestamp(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000) * 1000
}

/**
 * 任务执行数据点（用于折线图）
 */
interface TaskExecutionPoint {
  timestamp: number // 13位毫秒时间戳（定时表达式触发时间）
  taskId: number
  taskName: string
  taskType: string
  duration: number // 执行耗时（整数秒）
  success: boolean
}

/**
 * 完整的仪表板数据响应
 */
export interface DashboardData {
  stats: {
    todaySuccessCount: number
    todayFailureCount: number
    enabledCount: number
    disabledCount: number
  }
  taskTrend: TaskExecutionPoint[] // 任务运行趋势数据
}

/**
 * 获取仪表板完整数据
 * @param taskType 任务类型筛选
 * @param date 日期字符串 (YYYY-MM-DD)
 */
export async function getDashboardData(
  taskType: TaskType = 'all',
  date: string = getDateStr(new Date()),
): Promise<DashboardData> {
  try {
    const data: DashboardData = {
      stats: await getStats(taskType),
      taskTrend: await getTaskTrendData(taskType, date),
    }

    return data
  }
  catch (error) {
    logger.error('[定时任务监控] 获取仪表板数据异常', error)
    throw error
  }
}

/**
 * 获取实时统计指标
 */
async function getStats(taskType: TaskType) {
  const summary = getTodayStatsSummary()

  // 获取任务启用/禁用统计
  let enabledCount = 0
  let disabledCount = 0

  try {
    const tasks = await db.tasks.$list()
    for (const task of tasks) {
      if (taskType !== 'all' && task.type !== taskType)
        continue
      if (task.active === 1) {
        enabledCount++
      }
      else {
        disabledCount++
      }
    }
  }
  catch (error) {
    logger.warn('[定时任务监控] 获取任务统计失败', error)
  }

  return {
    todaySuccessCount: summary?.successCount ?? 0,
    todayFailureCount: summary?.failureCount ?? 0,
    enabledCount,
    disabledCount,
  }
}

/**
 * 获取任务运行趋势数据
 * @param taskType 任务类型筛选
 * @param date 日期字符串 (YYYY-MM-DD)
 */
async function getTaskTrendData(
  taskType: TaskType,
  date: string,
): Promise<TaskExecutionPoint[]> {
  try {
    // 解析日期字符串
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)

    // 当天 00:00:00（对齐到秒）
    const startTimestamp = getAlignedTimestamp(new Date(targetDate.setHours(0, 0, 0, 0)))
    // 当天 23:59:59.999
    const endTimestamp = startTimestamp + 24 * 60 * 60 * 1000 - 1

    // 查询数据库中的执行记录（24小时范围）
    const records = await db.tasksExecutionStats.findMany({
      where: {
        exec_timestamp: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        ...(taskType !== 'all' ? { task_type: taskType } : {}),
      },
      orderBy: {
        exec_timestamp: 'asc',
      },
    })

    // 转换为前端数据格式
    const trendData: TaskExecutionPoint[] = records.map(record => ({
      timestamp: Number(record.exec_timestamp),
      taskId: record.task_id,
      taskName: record.task_name,
      taskType: record.task_type,
      duration: record.duration,
      success: record.success === 1,
    }))

    return trendData
  }
  catch (error) {
    logger.warn('[定时任务监控] 获取任务趋势数据失败', error)
    return []
  }
}
