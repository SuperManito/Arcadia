import type { ConfigKey } from '../type/config'
import db from '../../db'
import {
  ConfigKeyCli,
  ConfigKeyRuntime,
  ConfigKeySystem,
  ConfigKeyUser,
  ConfigModule,
} from '../type/config'

export interface ConfigUpdateItem {
  key: ConfigKey
  module: ConfigModule
  value: string | number
}

/**
 * 验证配置键是否有效
 */
export function validateConfigFieldKey(key: string, module: ConfigModule): void {
  let validKeys: ConfigKey[] = []
  switch (module) {
    case ConfigModule.RUNTIME:
      validKeys = Object.values(ConfigKeyRuntime)
      break
    case ConfigModule.USER:
      validKeys = Object.values(ConfigKeyUser)
      break
    case ConfigModule.CLI:
      validKeys = Object.values(ConfigKeyCli)
      break
    case ConfigModule.SYSTEM:
      validKeys = Object.values(ConfigKeySystem)
      break
  }
  if (!validKeys.includes(key as any)) {
    throw new Error(`无效的配置键: module=${module}, key=${key}`)
  }
}

/**
 * 批量更新或创建配置
 */
export async function updateConfigValues(entries: ConfigUpdateItem[]): Promise<void> {
  if (entries.length === 0)
    return

  // 校验并按 module:key 去重，保留最后一条
  const normalized: ConfigUpdateItem[] = []
  const entryIndex = new Map<string, number>()
  for (const entry of entries) {
    validateConfigFieldKey(entry.key, entry.module)
    const unique = `${entry.module}:${entry.key}`
    const existingIndex = entryIndex.get(unique)
    if (existingIndex !== undefined) {
      normalized[existingIndex] = entry
    }
    else {
      entryIndex.set(unique, normalized.length)
      normalized.push(entry)
    }
  }

  // 查询现有记录，区分新增和更新
  const keys = normalized.map(({ key }) => key)
  const modules = [...new Set(normalized.map(({ module }) => module))]
  const existing = await db.config.$list({
    where: { module: { in: modules }, key: { in: keys } },
  })
  const existingMap = new Map(existing.map(item => [`${item.module}:${item.key}`, item]))

  for (const { key, module, value } of normalized) {
    const record = existingMap.get(`${module}:${key}`)
    if (record) {
      await db.config.$updateById({ id: record.id, data: { value: String(value) } })
    }
  }
  const toCreate = normalized.filter(({ key, module }) => !existingMap.has(`${module}:${key}`))
  if (toCreate.length > 0) {
    await db.config.$create(toCreate.map(({ key, module, value }) => ({ key, module, value: String(value) })))
  }
}

/**
 * 批量更新用户配置
 */
export async function updateUserConfigValues(entries: Array<{ key: ConfigKeyUser, value: string | number }>) {
  return updateConfigValues(entries.map(({ key, value }) => ({ key, module: ConfigModule.USER, value })))
}

/**
 * 批量更新运行时配置
 */
export async function updateRuntimeConfigValues(entries: Array<{ key: ConfigKeyRuntime, value: string | number }>) {
  return updateConfigValues(entries.map(({ key, value }) => ({ key, module: ConfigModule.RUNTIME, value })))
}

/**
 * 批量更新 CLI 配置
 */
export async function updateCliConfigValues(entries: Array<{ key: ConfigKeyCli, value: string | number }>) {
  return updateConfigValues(entries.map(({ key, value }) => ({ key, module: ConfigModule.CLI, value })))
}

/**
 * 批量更新系统配置
 */
export async function updateSystemConfigValues(entries: Array<{ key: ConfigKeySystem, value: string | number }>) {
  return updateConfigValues(entries.map(({ key, value }) => ({ key, module: ConfigModule.SYSTEM, value })))
}

/**
 * 按模块批量更新配置
 */
export async function updateModuleConfigValues(module: ConfigModule, entries: Array<{ key: ConfigKey, value: string | number }>): Promise<void> {
  return updateConfigValues(entries.map(({ key, value }) => ({ key, module, value })))
}
