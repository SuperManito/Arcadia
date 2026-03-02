import type { openApiAccessKeyModel } from '../../db'
import db from '../../db'
import { randomString } from '../../utils'
import { logger } from '../../utils/logger'

/**
 * OpenAPI 资源类型
 */
export const OPEN_API_RESOURCE_TYPES = ['cron', 'file', 'env'] as const
export type OpenApiResourceType = typeof OPEN_API_RESOURCE_TYPES[number]

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
 * 解析权限字符串为资源类型数组
 * 空字符串表示不限制（允许所有资源类型）
 */
function parsePermissions(permissions: string): OpenApiResourceType[] {
  if (!permissions || permissions.trim() === '') {
    return []
  }
  return permissions
    .split(',')
    .map(p => p.trim())
    .filter((p): p is OpenApiResourceType => OPEN_API_RESOURCE_TYPES.includes(p as OpenApiResourceType))
}

/**
 * 检查 Token 是否有权限访问指定资源类型
 * 若 permissions 为空则表示不限制，允许所有类型
 */
export function hasPermission(record: { permissions?: string | null }, resourceType: OpenApiResourceType): boolean {
  if (!record.permissions || record.permissions.trim() === '') {
    return true
  }
  const allowed = parsePermissions(record.permissions)
  return allowed.includes(resourceType)
}

/**
 * 将资源类型数组序列化为存储字符串
 * 空数组表示不限制
 */
export function serializePermissions(types: OpenApiResourceType[]): string {
  return types.join(',')
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
  permissions?: OpenApiResourceType[]
}) {
  const token = generateToken()
  const record = await db.openApiAccessKey.$create({
    value: token,
    name: data?.name || '',
    expire_time: data?.expire_time || null,
    enable: 1,
    permissions: data?.permissions ? serializePermissions(data.permissions) : '',
  })
  tokenCache.set((record as openApiAccessKeyModel).value, record)
  return record
}

/**
 * 获取 Token 列表
 */
export async function listTokens() {
  return await db.openApiAccessKey.$list()
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
    permissions?: OpenApiResourceType[]
  },
) {
  const { permissions, ...rest } = data
  const updateData: any = { ...rest }
  if (permissions !== undefined) {
    updateData.permissions = serializePermissions(permissions)
  }
  const result = await db.openApiAccessKey.update({
    where: { id },
    data: updateData,
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
