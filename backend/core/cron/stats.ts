import type { tasksModel } from '../../db'
import db from '../../db'
import { logger } from '../../utils/logger'

/**
 * 持久化单条任务执行记录到数据库
 */
export async function persistTaskExecution(task: Pick<tasksModel, 'id' | 'name' | 'type'>, duration: number, success: boolean) {
  const execTimestamp = Date.now()
  const formattedDuration = duration < 1
    ? 0
    : Math.round(duration)

  const record = {
    task_id: task.id,
    task_name: task.name,
    task_type: task.type,
    exec_timestamp: execTimestamp,
    duration: formattedDuration,
    success: success ? 1 : 0,
  }

  try {
    await db.tasksExecutionStats.$create(record)
  }
  catch (e: any) {
    logger.warn('[定时任务监控] 持久化失败', e.message || e)
  }
}
