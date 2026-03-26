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
 * 写入登录日志
 */
export async function addLoginLog(data: { ip: string, address: string, result: number }) {
  if (!data.ip && !data.address)
    return
  await db.loginLog.create({ data })
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
  if (records[1]) {
    const { ip, address, time } = records[1]
    return { ip, address, time }
  }
  return null
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
