import type { openApiAccessKeyModel } from '../../db'
import db from '../../db'
import { randomString } from '../../utils'
import { logger } from '../../utils/logger'

// 权限键定义
export type PermissionKey
  = | 'cron:query' // 查询定时任务（列表、搜索、运行状态）
    | 'cron:manage' // 管理定时任务（创建、修改、删除、排序）[危险 - 默认禁用]
    | 'cron:run' // 运行定时任务（手动触发、终止）[危险 - 默认禁用]
    | 'env:query' // 查询环境变量（列表、搜索、详情）
    | 'env:manage' // 管理环境变量（创建、修改、删除、导入导出）
    | 'file:list' // 列出文件目录（目录树、文件属性）
    | 'file:read' // 读取文件内容（读取、下载）[危险 - 默认禁用]
    | 'file:write' // 写入文件系统（创建、修改、删除、移动）[危险 - 默认禁用]
    | 'exec:cmd' // 执行 Shell 命令（任意 Shell 指令）[危险 - 默认禁用]
    | 'exec:run' // 运行代码文件（指定路径的代码文件）[危险 - 默认禁用]
    | 'exec:status' // 查询执行状态（命令/代码文件运行状态）[危险 - 默认禁用]
    | 'exec:stop' // 终止运行（终止运行中的命令/代码文件）[危险 - 默认禁用]

export type PermissionGroup = 'cron' | 'env' | 'file' | 'exec'

export interface PermissionMeta {
  group: PermissionGroup
  label: string
  desc: string
  // 危险权限：创建令牌时默认禁用
  dangerous: boolean
}

export const PERMISSION_META: Record<PermissionKey, PermissionMeta> = {
  'cron:query': { group: 'cron', label: '查询定时任务', desc: '允许查询、分页列表、获取标签和运行状态', dangerous: false },
  'cron:manage': { group: 'cron', label: '管理定时任务', desc: '允许创建、修改、删除定时任务及调整排序', dangerous: true },
  'cron:run': { group: 'cron', label: '运行定时任务', desc: '允许手动触发或终止定时任务的执行', dangerous: true },
  'env:query': { group: 'env', label: '查询环境变量', desc: '允许查询、分页列表及获取环境变量详情', dangerous: false },
  'env:manage': { group: 'env', label: '管理环境变量', desc: '允许创建、修改、删除、排序及批量导入导出', dangerous: false },
  'file:list': { group: 'file', label: '列出文件目录', desc: '允许获取目录列表、文件树和文件属性', dangerous: false },
  'file:read': { group: 'file', label: '读取文件内容', desc: '允许读取任意文件的内容及下载文件', dangerous: true },
  'file:write': { group: 'file', label: '写入文件系统', desc: '允许创建、修改、重命名、移动、删除文件', dangerous: true },
  'exec:cmd': { group: 'exec', label: '执行 Shell 命令', desc: '允许执行 Shell 命令', dangerous: true },
  'exec:run': { group: 'exec', label: '运行代码文件', desc: '允许运行指定路径的代码文件', dangerous: true },
  'exec:status': { group: 'exec', label: '查询执行状态', desc: '允许查询命令或代码文件的当前运行状态', dangerous: true },
  'exec:stop': { group: 'exec', label: '终止运行', desc: '允许终止正在执行中的命令或代码文件', dangerous: true },
}

// 创建令牌时默认启用的权限（不含危险权限）
export const DEFAULT_PERMISSIONS: PermissionKey[] = [
  'cron:query',
  'env:query',
  'env:manage',
  'file:list',
]

// 所有权限键，供遍历校验使用
export const ALL_PERMISSION_KEYS = Object.keys(PERMISSION_META) as PermissionKey[]

// 路由权限映射
interface RoutePermRule {
  // HTTP 方法限定，undefined 表示匹配所有方法
  methods?: string[]
  pattern: RegExp
  permission: PermissionKey
}

/**
 * OpenAPI 路由权限映射表（路径相对于 /api/open/）
 */
const ROUTE_PERM_RULES: RoutePermRule[] = [
  // Cron
  { pattern: /^\/cron\/v1\/(page|query|runningTasks|tagsList)$/, permission: 'cron:query' },
  { pattern: /^\/cron\/v1\/(create|update|delete|order)$/, permission: 'cron:manage' },
  { pattern: /^\/cron\/v1\/(run|terminate)$/, permission: 'cron:run' },
  // Env
  { pattern: /^\/env\/v1\/(page|query|queryMember|queryById|tags)$/, permission: 'env:query' },
  { pattern: /^\/env\/v1\/(create|update|delete|order|changeStatus)$/, permission: 'env:manage' },
  // File
  { pattern: /^\/file\/v1\/(list|info)$/, permission: 'file:list' },
  { pattern: /^\/file\/v1\/(content|download)$/, methods: ['GET'], permission: 'file:read' },
  { pattern: /^\/file\/v1\/content$/, methods: ['POST'], permission: 'file:write' },
  { pattern: /^\/file\/v1\/(rename|move|create|delete|upload)$/, permission: 'file:write' },
  // Exec
  { pattern: /^\/exec\/v1\/(cmd|cmdStream)$/, permission: 'exec:cmd' },
  { pattern: /^\/exec\/v1\/(run|runStream)$/, permission: 'exec:run' },
  { pattern: /^\/exec\/v1\/status$/, permission: 'exec:status' },
  { pattern: /^\/exec\/v1\/stopRun$/, permission: 'exec:stop' },
]

/**
 * 根据请求方法和路径解析所需权限。
 * 返回 null 表示该路径无需权限校验（如 message、alert、extra 路由）。
 */
export function resolveRoutePermission(method: string, path: string): PermissionKey | null {
  const upperMethod = method.toUpperCase()
  for (const rule of ROUTE_PERM_RULES) {
    if (!rule.pattern.test(path))
      continue
    if (rule.methods && !rule.methods.includes(upperMethod))
      continue
    return rule.permission
  }
  return null
}

/**
 * 解析令牌权限字符串为权限键数组。
 * 空字符串（含历史存量令牌）按默认安全权限集处理。
 */
function parsePermissions(permissions: string): PermissionKey[] {
  if (!permissions || permissions.trim() === '') {
    return [...DEFAULT_PERMISSIONS]
  }
  return permissions
    .split(',')
    .map(p => p.trim())
    .filter((p): p is PermissionKey => p in PERMISSION_META)
}

/**
 * 检查令牌是否拥有指定权限。
 */
export function hasPermission(record: { permissions?: string | null }, requiredPermission: PermissionKey): boolean {
  const allowed = parsePermissions(record.permissions ?? '')
  return allowed.includes(requiredPermission)
}

/**
 * 将权限键数组序列化为存储字符串。
 */
export function serializePermissions(keys: PermissionKey[]): string {
  return keys.join(',')
}

// Token 缓存
const tokenCache = new Map<string, openApiAccessKeyModel | null>()

function invalidateCache(token: string) {
  tokenCache.delete(token)
}

export function generateToken() {
  return randomString(32)
}

export async function verifyToken(token: string) {
  const cached = tokenCache.get(token)
  if (cached !== undefined) {
    if (!cached)
      return null
    if (cached.enable !== 1)
      return null
    if (cached.expire_time && new Date(cached.expire_time) < new Date()) {
      invalidateCache(token)
      return null
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
    if (record.expire_time && new Date(record.expire_time) < new Date()) {
      return null
    }
    tokenCache.set(token, record)
    return record
  }
  catch (e: any) {
    logger.error('OpenAPI 验证 Token 失败', e.message || e)
    return null
  }
}

/**
 * 创建 Token，新令牌默认使用安全权限集（不含危险权限）。
 */
export async function createToken(data?: {
  name?: string
  expire_time?: Date | null
  permissions?: PermissionKey[]
}) {
  const token = generateToken()
  const perms = data?.permissions ?? DEFAULT_PERMISSIONS
  const record = await db.openApiAccessKey.$create({
    value: token,
    name: data?.name || '',
    expire_time: data?.expire_time || null,
    enable: 1,
    permissions: serializePermissions(perms),
  }) as openApiAccessKeyModel
  tokenCache.set((record as openApiAccessKeyModel).value, record)
  return record
}

export async function listTokens() {
  return await db.openApiAccessKey.$list()
}

export async function updateToken(
  id: number,
  data: {
    name?: string
    expire_time?: Date | null
    enable?: number
    permissions?: PermissionKey[]
  },
) {
  const { permissions, ...rest } = data
  const updateData: any = { ...rest }
  if (permissions !== undefined) {
    updateData.permissions = serializePermissions(permissions)
  }
  const result = await db.openApiAccessKey.update({ where: { id }, data: updateData })
  invalidateCache(result.value)
  return result
}

export async function deleteToken(id: number) {
  const record = await db.openApiAccessKey.findUnique({ where: { id } })
  if (record)
    invalidateCache(record.value)
  await db.openApiAccessKey.$deleteById(id)
}

export async function initTokenCache() {
  try {
    const records = await db.openApiAccessKey.findMany({ where: { enable: 1 } })
    for (const record of records) {
      tokenCache.set(record.value, record)
    }
  }
  catch (e: any) {
    logger.error('初始化 OpenAPI 访问令牌缓存失败 =>', e.message || e)
  }
}
