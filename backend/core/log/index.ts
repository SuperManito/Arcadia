import db from '../../db'
import { setLogDbHandler } from '../../utils/logger'

/**
 * 初始化日志模块
 */
export function initLog() {
  setLogDbHandler(addServerLog)
}

/**
 * 写入操作日志
 */
export async function addServerLog(type: string, content: string) {
  try {
    await db.serverLog.create({ data: { type, content } })
  }
  catch {
    // 静默失败，避免触发循环调用
  }
}

/**
 * 分页查询操作日志，支持类型过滤与内容搜索
 */
export async function getServerLogs(page: number, size: number, type?: string, search?: string) {
  const where: Record<string, any> = {}
  if (type && type.trim())
    where.type = type.trim()
  if (search && search.trim())
    where.content = { contains: search.trim() }
  return await db.serverLog.$page({ page, size, where, orderBy: { time: 'desc' } })
}

/**
 * 写入登录日志
 */
export async function addLoginLog(data: { ip: string, address: string, result: number }) {
  if (!data.ip && !data.address)
    return
  await db.loginLog.create({ data })
}

/**
 * 分页查询登录日志
 */
export async function getLoginLogs(page: number, size: number) {
  return await db.loginLog.$page({ page, size, where: {}, orderBy: { time: 'desc' } })
}

/**
 * 获取上次成功登录信息
 */
export async function getLastLoginInfo() {
  const records = await db.loginLog.findMany({
    where: { result: 1 },
    orderBy: { time: 'desc' },
    take: 2,
  })
  return records[1] ?? null
}

/**
 * 清理指定天数之前的操作日志
 */
export async function cleanServerLogs(days: number) {
  const cutoff = new Date(Date.now() - days * 86400000)
  return await db.serverLog.deleteMany({ where: { time: { lt: cutoff } } })
}

/**
 * 清理指定天数之前的登录日志
 */
export async function cleanLoginLogs(days: number) {
  const cutoff = new Date(Date.now() - days * 86400000)
  return await db.loginLog.deleteMany({ where: { time: { lt: cutoff } } })
}
