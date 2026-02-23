import type { tasksModel } from '../../db'
import db from '../../db'
import { logger } from '../../utils/logger'
import { runningTasks } from './taskRunner'
import type { TasksFilterType } from '../type/cron'
import { TasksTypeEnum } from '../type/cron'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * 获取指定日期当天的起止时间戳（本地零点到23:59:59.999）
 */
function getDayRange(date: Date): { start: number, end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return { start, end: start + ONE_DAY_MS - 1 }
}

/**
 * 查询指定时间范围内的成功/失败计数
 */
async function getExecCounts(start: number, end: number, taskType: TasksFilterType) {
  const records = await db.tasksExecutionStats.findMany({
    where: {
      exec_timestamp: { gte: start, lte: end },
      ...(taskType !== TasksTypeEnum.ALL ? { task_type: taskType } : {}),
    },
  })
  return {
    successCount: records.filter(r => r.success === 1).length,
    failureCount: records.filter(r => r.success === 0).length,
  }
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
 * 统计指标数据
 */
export interface DashboardStats {
  todaySuccessCount: number
  todayFailureCount: number
  yesterdaySuccessCount: number
  yesterdayFailureCount: number
  enabledCount: number
  disabledCount: number
  runningCount: number
}

/**
 * 正在运行的任务信息
 */
export interface RunningTaskInfo {
  id: number
  name: string
  type: string
  cron: string
  shell: string
}

/**
 * 获取统计指标（今日/昨日成功失败数 + 启用禁用数）
 */
export async function getDashboardStats(taskType: TasksFilterType = TasksTypeEnum.ALL): Promise<DashboardStats> {
  let enabledCount = 0
  let disabledCount = 0

  try {
    const tasks = await db.tasks.$list()
    for (const task of tasks) {
      if (taskType !== TasksTypeEnum.ALL && task.type !== taskType)
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

  let todaySuccessCount = 0
  let todayFailureCount = 0
  let yesterdaySuccessCount = 0
  let yesterdayFailureCount = 0

  try {
    const now = new Date()
    const today = getDayRange(now)
    const yesterday = getDayRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

    const [todayCounts, yesterdayCounts] = await Promise.all([
      getExecCounts(today.start, today.end, taskType),
      getExecCounts(yesterday.start, yesterday.end, taskType),
    ])

    todaySuccessCount = todayCounts.successCount
    todayFailureCount = todayCounts.failureCount
    yesterdaySuccessCount = yesterdayCounts.successCount
    yesterdayFailureCount = yesterdayCounts.failureCount
  }
  catch (error) {
    logger.warn('[定时任务监控] 获取执行统计失败', error)
  }

  const runningCount = Object.values(runningTasks)
    .filter(task => taskType === TasksTypeEnum.ALL || task.type === taskType)
    .length

  return {
    todaySuccessCount,
    todayFailureCount,
    yesterdaySuccessCount,
    yesterdayFailureCount,
    enabledCount,
    disabledCount,
    runningCount,
  }
}

/**
 * 获取任务运行趋势数据
 * @param taskType 任务类型筛选
 * @param date 日期字符串 (YYYY-MM-DD)
 */
export async function getDashboardTrend(
  taskType: TasksFilterType = TasksTypeEnum.ALL,
  date: string,
): Promise<TaskExecutionPoint[]> {
  try {
    const [year, month, day] = date.split('-').map(Number)
    const { start: startTimestamp, end: endTimestamp } = getDayRange(new Date(year, month - 1, day))

    const records = await db.tasksExecutionStats.findMany({
      where: {
        exec_timestamp: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        ...(taskType !== TasksTypeEnum.ALL ? { task_type: taskType } : {}),
      },
      orderBy: {
        exec_timestamp: 'asc',
      },
    })

    return records.map(record => ({
      timestamp: Number(record.exec_timestamp),
      taskId: record.task_id,
      taskName: record.task_name,
      taskType: record.task_type,
      duration: record.duration,
      success: record.success === 1,
    }))
  }
  catch (error) {
    logger.warn('[定时任务监控] 获取任务趋势数据失败', error)
    return []
  }
}

/**
 * 获取正在运行的任务列表
 */
export function getDashboardRunning(taskType: TasksFilterType = TasksTypeEnum.ALL): RunningTaskInfo[] {
  const tasks: tasksModel[] = Object.values(runningTasks)
  return tasks
    .filter(task => taskType === TasksTypeEnum.ALL || task.type === taskType)
    .map(task => ({
      id: task.id,
      name: task.name,
      type: task.type,
      cron: task.cron,
      shell: task.shell,
    }))
}
