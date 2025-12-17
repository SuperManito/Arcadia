import type { openApiAccessKeyModel } from '../../db'
import db from '../../db'
import { randomString } from '../../utils'
import { logger } from '../../utils/logger'

/**
 * Token 验证结果缓存
 */
const tokenCache = new Map<string, any | null>()

/**
 * 清除指定 Token 的缓存
 */
function invalidateCache(token: string) {
  tokenCache.delete(token)
}

/**
 * 生成令牌
 */
export function generateToken() {
  return randomString(32)
}

/**
 * 验证 Token 是否有效
 */
export async function verifyToken(token: string) {
  const cached = tokenCache.get(token)
  if (cached !== undefined) {
    if (!cached) {
      return null
    }
    if (cached.enable !== 1) {
      return null
    }
    if (cached.expire_time) {
      if (new Date(cached.expire_time) < new Date()) {
        invalidateCache(token)
        return null
      }
    }
    return cached
  }
  try {
    const record = await db.openApiAccessKey.findFirst({
      where: { value: token, enable: 1 },
    })
    if (!record) {
      tokenCache.set(token, null)
      return null
    }
    if (record.expire_time) {
      if (new Date(record.expire_time) < new Date()) {
        return null
      }
    }
    tokenCache.set(token, record)
    return record
  }
  catch (error) {
    logger.error('验证 Token 失败:', error)
    return null
  }
}

/**
 * 创建 Token
 */
export async function createToken(data?: {
  name?: string
  expire_time?: Date | null
}) {
  const token = generateToken()
  const record = await db.openApiAccessKey.$create({
    value: token,
    name: data?.name || '',
    expire_time: data?.expire_time || null,
    enable: 1,
  })
  tokenCache.set((record as openApiAccessKeyModel).value, record)
  return record
}

/**
 * 获取 Token 列表
 */
export async function listTokens() {
  return await db.openApiAccessKey.findMany()
}

/**
 * 更新 Token
 */
export async function updateToken(
  id: number,
  data: {
    name?: string
    expire_time?: Date | null
    enable?: number
  },
) {
  const result = await db.openApiAccessKey.update({
    where: { id },
    data,
  })
  invalidateCache(result.value)
  return result
}

/**
 * 删除 Token
 */
export async function deleteToken(id: number) {
  const record = await db.openApiAccessKey.findUnique({
    where: { id },
  })
  if (record) {
    invalidateCache(record.value)
  }
  await db.openApiAccessKey.$deleteById(id)
}

/**
 * 初始化，加载所有启用的 Token 缓存
 */
export async function initTokenCache() {
  try {
    const records = await db.openApiAccessKey.findMany({
      where: { enable: 1 },
    })
    for (const record of records) {
      tokenCache.set(record.value, record)
    }
  }
  catch (error) {
    logger.error('初始化 OpenAPI 访问令牌缓存失败 =>', error)
  }
}
