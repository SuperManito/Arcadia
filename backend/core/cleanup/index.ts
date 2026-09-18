import type { ConfigDataSystem } from '../type/config'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getSystemModuleConfig } from '../config'
import { ConfigKeySystem } from '../type/config'
import { CLI_CMD } from '../type/cli'
import { cleanLoginLogs, cleanOpenApiLogs, cleanServerLogs } from '../log'
import { cleanReadMessages } from '../message'
import db from '../../db'
import { APP_ROOT_DIR } from '../type'

/**
 * 支持的清理类型
 *
 * - `log`：系统日志（操作日志 + 登录日志 + 开放接口日志）+ 代码文件运行日志
 * - `message`：消息中心已读消息
 * - `taskHistory`：定时任务执行统计数据
 */
export type CleanupType = 'log' | 'message' | 'taskHistory'

export const CLEANUP_TYPES: CleanupType[] = ['log', 'message', 'taskHistory']

/**
 * 日志与数据清理
 *
 * @param days  可选覆盖值；不传则读取各类型对应的配置保留天数
 * @param types 可选类型过滤；不传则执行全部类型
 */
export async function runCleanup(
  days?: number | null,
  types: CleanupType[] = CLEANUP_TYPES,
): Promise<Record<string, any>> {
  const result: Record<string, any> = {}

  // 一次性查询所有系统配置（仅在需要读取配置时）
  const config = typeof days === 'number' ? null : await getSystemModuleConfig()

  // 代码文件运行日志（arcadia rmlog）
  if (types.includes('log')) {
    try {
      const args = typeof days === 'number' ? [String(days)] : []
      await promisify(exec)(`${CLI_CMD.RMLOG} ${args.join(' ')}`.trim(), {
        cwd: APP_ROOT_DIR,
        timeout: 60_000,
      })
    }
    catch {}
  }

  // 系统日志（操作日志 + 登录日志 + 开放接口日志）
  if (types.includes('log')) {
    const [serverResult, loginResult, openApiResult] = await Promise.all([
      cleanServerLogs(getRetentionDays(config, ConfigKeySystem.SERVER_LOG_RETENTION_DAYS, days)),
      cleanLoginLogs(getRetentionDays(config, ConfigKeySystem.LOGIN_LOG_RETENTION_DAYS, days)),
      cleanOpenApiLogs(getRetentionDays(config, ConfigKeySystem.OPEN_API_LOG_RETENTION_DAYS, days)),
    ])
    result.log = { serverLog: serverResult.count, loginLog: loginResult.count, openApiLog: openApiResult.count }
  }

  // 已读消息
  if (types.includes('message')) {
    const retentionDays = getRetentionDays(config, ConfigKeySystem.MESSAGE_RETENTION_DAYS, days)
    const msgResult = await cleanReadMessages(retentionDays)
    result.message = { count: msgResult?.count ?? 0 }
  }

  // 定时任务监控数据
  if (types.includes('taskHistory')) {
    const retentionDays = getRetentionDays(config, ConfigKeySystem.TASK_HISTORY_RETENTION_DAYS, days)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    cutoffDate.setHours(0, 0, 0, 0)
    const taskResult = await db.tasksExecutionStats.deleteMany({
      where: { exec_timestamp: { lt: cutoffDate.getTime() } },
    })
    result.taskHistory = { count: taskResult.count }
  }

  return result
}

function getRetentionDays(config: ConfigDataSystem | null, key: ConfigKeySystem, override?: number | null): number {
  if (typeof override === 'number')
    return override
  return parseRetentionDays(config![key])
}

/**
 * 解析保留天数配置值，无效值回退到 7 天
 */
function parseRetentionDays(value: string): number {
  const days = Number.parseInt(value, 10)
  return Number.isFinite(days) && days > 0 ? days : 7
}
