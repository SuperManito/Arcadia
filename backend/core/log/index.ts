import db from '../../db'
import { setLogDbHandler } from '../../utils/logger'

/**
 * 初始化日志模块
 */
export function initLog() {
  setLogDbHandler(addServerLog)
  initOpenApiLogFlush()
}

/**
 * 写入操作日志
 */
export async function addServerLog(type: string, content: string) {
  try {
    await db.serverLog.$create({ type, content })
  }
  catch {
    // 静默失败，避免触发循环调用
  }
}

/**
 * 写入登录日志
 */
export async function addLoginLog(data: { ip: string, address: string, result: number, browser?: string, os?: string, device?: string }) {
  if (!data.ip && !data.address)
    return
  await db.loginLog.$create(data)
}

/**
 * 获取上次成功登录信息
 */
export async function getLastLoginInfo() {
  const records = await db.loginLog.$list({
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
  return await db.serverLog.deleteMany({
    where: {
      time: { lt: cutoff },
    },
  })
}

/**
 * 清理登录日志
 */
export async function cleanLoginLogs(days: number) {
  const cutoff = new Date(Date.now() - days * 86400000)
  return await db.loginLog.deleteMany({
    where: {
      time: { lt: cutoff },
    },
  })
}

/**
 * 清理开放接口日志
 */
export async function cleanOpenApiLogs(days: number) {
  const cutoff = new Date(Date.now() - days * 86400000)
  return await db.openApiLog.deleteMany({
    where: {
      time: { lt: cutoff },
    },
  })
}

/**
 * 清空操作日志
 */
export async function clearServerLogs() {
  return await db.serverLog.deleteMany({ where: {} })
}

/**
 * 清空登录日志
 */
export async function clearLoginLogs() {
  return await db.loginLog.deleteMany({ where: {} })
}

/**
 * 清空开放接口日志
 */
export async function clearOpenApiLogs() {
  await flushOpenApiLogBuffer()
  return await db.openApiLog.deleteMany({ where: {} })
}

/**
 * 开放接口日志条目
 */
export interface OpenApiLogEntry {
  method: string
  path: string
  ip: string
  address: string
  browser: string
  os: string
  device: string
}

const openApiLogBuffer: OpenApiLogEntry[] = []
const FLUSH_INTERVAL = 5000
const FLUSH_THRESHOLD = 50
let flushTimer: ReturnType<typeof setInterval> | null = null

function initOpenApiLogFlush() {
  if (flushTimer)
    return
  flushTimer = setInterval(() => flushOpenApiLogBuffer(), FLUSH_INTERVAL)
  const gracefulFlush = async () => {
    if (flushTimer)
      clearInterval(flushTimer)
    try {
      await flushOpenApiLogBuffer()
    }
    catch {}
    process.exit(0)
  }
  process.on('SIGTERM', gracefulFlush)
  process.on('SIGINT', gracefulFlush)
}

async function flushOpenApiLogBuffer() {
  if (openApiLogBuffer.length === 0)
    return
  const batch = openApiLogBuffer.splice(0)
  try {
    await db.openApiLog.$create(batch)
  }
  catch {
    // 写入失败时将数据放回队列，缓冲区上限 5000 条，超限丢弃最旧数据
    const MAX_BUFFER = 5000
    const merged = [
      ...batch,
      ...openApiLogBuffer,
    ]
    openApiLogBuffer.length = 0
    if (merged.length > MAX_BUFFER) {
      openApiLogBuffer.push(...merged.slice(merged.length - MAX_BUFFER))
    }
    else {
      openApiLogBuffer.push(...merged)
    }
  }
}

/**
 * 将 OpenAPI 日志条目加入写入队列
 *
 * 数据通过内存缓冲区异步批量写入，保证请求顺序与记录顺序一致且不阻塞主线程
 */
export function enqueueOpenApiLog(entry: OpenApiLogEntry) {
  openApiLogBuffer.push(entry)
  if (openApiLogBuffer.length >= FLUSH_THRESHOLD) {
    void flushOpenApiLogBuffer()
  }
}
