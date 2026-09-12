import type { configModel } from '../../db'
import type {
  ConfigDataCli,
  ConfigDataRuntime,
  ConfigDataSystem,
  ConfigDataUser,
  ConfigKey,
} from '../type/config'
import db from '../../db'
import {
  ConfigKeyCli,
  ConfigKeyRuntime,
  ConfigKeySystem,
  ConfigKeyUser,
  ConfigModule,
  DEFAULT_CONFIG_VALUES,
} from '../type/config'
import { generateCliConfigSh } from './cli'
import { applySystemTimezone, detectAndSaveSourcesIfEmpty } from './system'
import { isNotEmpty, randomString } from '../../utils'
import {
  updateModuleConfigValues,
  updateSystemConfigValues,
  updateUserConfigValues,
  validateConfigFieldKey,
} from './update'

export { updateCliConfigValues, updateRuntimeConfigValues, updateSystemConfigValues, updateUserConfigValues } from './update'

function validateConfigFieldModule(module: string) {
  const validModules = Object.values(ConfigModule) as ConfigModule[]
  if (!validModules.includes(module as any)) {
    throw new Error(`无效的配置键: module=${module}`)
  }
}

/**
 * 获取配置值
 */
export async function getConfigValue(key: ConfigKey, module: ConfigModule) {
  validateConfigFieldKey(key, module)
  try {
    const config = await db.config.findFirst({
      where: { key, module },
    })
    return config?.value ?? ''
  }
  catch {
    return ''
  }
}
export async function getUserConfigValue(key: ConfigKeyUser) {
  return getConfigValue(key, ConfigModule.USER)
}
export async function getRuntimeConfigValue(key: ConfigKeyRuntime) {
  return getConfigValue(key, ConfigModule.RUNTIME)
}

/**
 * 更新或创建配置
 */
export async function updateConfigValue(key: ConfigKey, module: ConfigModule, value: string | number) {
  validateConfigFieldKey(key, module)
  return await db.config.upsert({
    where: { key_module: { key, module } },
    update: { value: String(value) },
    create: { key, module, value: String(value) },
  })
}
export async function updateUserConfigValue(key: ConfigKeyUser, value: string | number) {
  return updateConfigValue(key, ConfigModule.USER, value)
}
export async function updateRuntimeConfigValue(key: ConfigKeyRuntime, value: string | number) {
  return updateConfigValue(key, ConfigModule.RUNTIME, value)
}

/**
 * 当前版本标签
 */
let _currentVersionTag = ''

/**
 * 获取当前版本标签
 *
 * @description 内存为空时回源数据库读取一次并缓存
 */
export async function getVersionTag(): Promise<string> {
  if (!_currentVersionTag)
    _currentVersionTag = await getConfigValue(ConfigKeyRuntime.UPDATE_CURRENT_TAG, ConfigModule.RUNTIME) || ''
  return _currentVersionTag
}

/**
 * 设置当前版本标签
 */
export function setVersionTagSync(tag: string): void {
  _currentVersionTag = tag
}

/**
 * JWT 密钥
 */
let _jwtSecret = ''

/**
 * 获取 JWT 密钥
 */
export function getJwtSecretSync(): string {
  return _jwtSecret
}

/**
 * 轮换 JWT 密钥
 */
export async function rotateJwtSecret(): Promise<void> {
  const newSecret = randomString(32)
  await updateRuntimeConfigValue(ConfigKeyRuntime.JWT_SECRET, newSecret)
  _jwtSecret = newSecret
}

/**
 * 获取模块配置并转换为键值对映射
 */
async function getModuleConfigMap(module: ConfigModule): Promise<Record<string, string>> {
  const configs = await db.config.$list({ where: { module } })
  const defaultKeys = Object.keys(DEFAULT_CONFIG_VALUES[module])

  // 补充对应模块缺失的配置字段记录
  if (configs.length < defaultKeys.length) {
    const existingKeys = new Set(configs.map(c => c.key))
    const defaultValues = DEFAULT_CONFIG_VALUES[module]
    const allKeys = Object.keys(defaultValues) as ConfigKey[]
    const entries: Array<{ key: ConfigKey, value: string }> = []
    for (const key of allKeys) {
      if (!existingKeys.has(key)) {
        entries.push({ key, value: defaultValues[key as keyof typeof defaultValues] })
      }
    }
    if (entries.length > 0) {
      await updateModuleConfigValues(module, entries)
    }
  }

  return configs.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)
}

/**
 * 获取配置
 */
export async function getUserModuleConfig() {
  const map = await getModuleConfigMap(ConfigModule.USER)
  const result = {} as ConfigDataUser

  for (const key of Object.values(ConfigKeyUser)) {
    const value = map[key] || DEFAULT_CONFIG_VALUES[ConfigModule.USER][key]
    switch (key) {
      case ConfigKeyUser.TOTP_ENABLED:
        result[key] = value === 'true'
        break
      default:
        result[key] = value
        break
    }
  }

  return result
}
export async function getRuntimeModuleConfig() {
  const map = await getModuleConfigMap(ConfigModule.RUNTIME)
  const result = {} as ConfigDataRuntime

  // 处理默认值并转换数据类型
  for (const key of Object.values(ConfigKeyRuntime)) {
    const value = map[key] || DEFAULT_CONFIG_VALUES[ConfigModule.RUNTIME][key]
    result[key] = value
  }
  return result
}

/**
 * 只读版本：列出 RUNTIME 模块现有记录并合并默认值，不补写缺失配置行
 */
export async function getRuntimeModuleConfigReadonly(): Promise<ConfigDataRuntime> {
  const configs = await db.config.$list({ where: { module: ConfigModule.RUNTIME } })
  const map = new Map(configs.map(c => [c.key, c.value]))
  const result = {} as ConfigDataRuntime
  for (const key of Object.values(ConfigKeyRuntime)) {
    result[key] = map.get(key) ?? DEFAULT_CONFIG_VALUES[ConfigModule.RUNTIME][key]
  }
  return result
}
export async function getCliModuleConfig() {
  const map = await getModuleConfigMap(ConfigModule.CLI)
  const result = {} as ConfigDataCli

  for (const key of Object.values(ConfigKeyCli)) {
    const value = map[key] ?? DEFAULT_CONFIG_VALUES[ConfigModule.CLI][key]
    result[key] = value
  }
  return result
}
export async function getSystemModuleConfig() {
  const map = await getModuleConfigMap(ConfigModule.SYSTEM)
  const result = {} as ConfigDataSystem

  for (const key of Object.values(ConfigKeySystem)) {
    const value = map[key] ?? DEFAULT_CONFIG_VALUES[ConfigModule.SYSTEM][key]
    result[key] = value
  }
  return result
}
export async function getModuleConfig(module: ConfigModule) {
  switch (module) {
    case ConfigModule.RUNTIME:
      return await getRuntimeModuleConfig()
    case ConfigModule.USER:
      return await getUserModuleConfig()
    case ConfigModule.CLI:
      return await getCliModuleConfig()
    case ConfigModule.SYSTEM:
      return await getSystemModuleConfig()
  }
}
export async function getFullConfig() {
  return {
    [ConfigModule.RUNTIME]: await getRuntimeModuleConfig(),
    [ConfigModule.USER]: await getUserModuleConfig(),
    [ConfigModule.CLI]: await getCliModuleConfig(),
    [ConfigModule.SYSTEM]: await getSystemModuleConfig(),
  }
}

/**
 * 清理无效和重复的配置记录
 */
async function cleanInvalidConfigs(): Promise<void> {
  const allConfigs = await db.config.$list()
  const idsToDelete: number[] = []
  const seenKeys = new Map<string, number>()

  for (const config of allConfigs) {
    // 验证 module 是否有效
    try {
      validateConfigFieldModule(config.module as ConfigModule)
    }
    catch {
      idsToDelete.push(config.id)
      continue
    }
    // 验证 key 是否有效
    try {
      validateConfigFieldKey(config.key, config.module as ConfigModule)
    }
    catch {
      idsToDelete.push(config.id)
      continue
    }
    // 检查是否重复（保留第一条，删除后续重复）
    const uniqueKey = `${config.module}:${config.key}`
    if (seenKeys.has(uniqueKey)) {
      idsToDelete.push(config.id)
    }
    else {
      seenKeys.set(uniqueKey, config.id)
    }
  }

  if (idsToDelete.length > 0) {
    await db.config.$deleteById(idsToDelete)
    // logger.info(`清理了 ${idsToDelete.length} 条无效或重复的配置记录`)
  }
}

/**
 * 初始化用户配置
 */
async function initUserConfig() {
  const config = await getUserModuleConfig()
  const entries: Array<{ key: ConfigKeyUser, value: string }> = []
  const defaultUsername = DEFAULT_CONFIG_VALUES[ConfigModule.USER][ConfigKeyUser.USERNAME]
  const defaultPassword = DEFAULT_CONFIG_VALUES[ConfigModule.USER][ConfigKeyUser.PASSWORD]

  // 认证信息为空，设置默认的用户名和密码（新装环境）
  if (!isNotEmpty(config.username)) {
    entries.push({ key: ConfigKeyUser.USERNAME, value: defaultUsername })
    config.username = defaultUsername
  }
  if (!isNotEmpty(config.password)) {
    entries.push({ key: ConfigKeyUser.PASSWORD, value: defaultPassword })
    config.password = defaultPassword
  }
  if (entries.length > 0) {
    await updateUserConfigValues(entries)
  }
}

/**
 * 初始化运行时配置
 */
async function initRuntimeConfig() {
  const config = await getRuntimeModuleConfig()
  const updates: Promise<configModel>[] = []
  if (!isNotEmpty(config.jwtSecret)) {
    const jwtSecret = randomString(32)
    updates.push(updateRuntimeConfigValue(ConfigKeyRuntime.JWT_SECRET, jwtSecret))
    config.jwtSecret = jwtSecret
  }
  if (updates.length > 0) {
    await Promise.all(updates)
  }
  // 将密钥加载到内存
  _jwtSecret = config.jwtSecret
  _currentVersionTag = config.updateCurrentTag || ''
}

/**
 * 初始化 CLI 功能配置
 */
async function initCliConfig() {
  await getCliModuleConfig()
  await generateCliConfigSh()
}

/**
 * 初始化系统全局配置
 */
async function initSystemConfig() {
  const config = await getSystemModuleConfig()
  if (config.timezone) {
    applySystemTimezone(config.timezone)
  }
  // 检测当前系统软件源
  detectAndSaveSourcesIfEmpty().catch(() => {})
}

/**
 * 迁移旧版 System 配置键名（UPPER_SNAKE_CASE → camelCase）
 */
async function _migrateSystemConfigKeys(): Promise<void> {
  const LEGACY_SYSTEM_KEYS: Record<string, ConfigKeySystem> = {
    SYSTEM_TIMEZONE: ConfigKeySystem.TIMEZONE,
    NPM_REGISTRY: ConfigKeySystem.NPM_REGISTRY,
    PIP_INDEX_URL: ConfigKeySystem.PIP_INDEX_URL,
    APT_MIRROR_URL: ConfigKeySystem.APT_MIRROR_URL,
    GEM_REGISTRY: ConfigKeySystem.GEM_REGISTRY,
    MESSAGE_RETENTION_DAYS: ConfigKeySystem.MESSAGE_RETENTION_DAYS,
    TASK_HISTORY_RETENTION_DAYS: ConfigKeySystem.TASK_HISTORY_RETENTION_DAYS,
    CLEANUP_CRON_EXPRESSION: ConfigKeySystem.CLEANUP_CRON_EXPRESSION,
    CLEANUP_CRON_ENABLED: ConfigKeySystem.CLEANUP_CRON_ENABLED,
  }
  const legacyKeys = Object.keys(LEGACY_SYSTEM_KEYS)
  if (legacyKeys.length === 0)
    return
  // 查找所有旧的 UPPER_SNAKE_CASE 记录
  const oldConfigs = await db.config.$list({ where: { module: ConfigModule.SYSTEM, key: { in: legacyKeys } } })
  if (oldConfigs.length === 0)
    return
  // 查找对应的新 camelCase 记录
  const newKeys = oldConfigs.map(c => LEGACY_SYSTEM_KEYS[c.key]).filter(Boolean)
  const newConfigMap = new Map<string, configModel>()
  if (newKeys.length > 0) {
    const newConfigs = await db.config.$list({ where: { module: ConfigModule.SYSTEM, key: { in: newKeys } } })
    for (const c of newConfigs)
      newConfigMap.set(c.key, c)
  }
  // 值不同时用旧值覆盖新记录，然后批量删除所有旧记录
  const entries: Array<{ key: ConfigKeySystem, value: string }> = []
  const idsToDelete: number[] = []
  for (const old of oldConfigs) {
    const newKey = LEGACY_SYSTEM_KEYS[old.key]
    const newRecord = newKey ? newConfigMap.get(newKey) : undefined
    if (newRecord && newRecord.value !== old.value) {
      entries.push({ key: newKey, value: old.value })
    }
    idsToDelete.push(old.id)
  }
  if (entries.length > 0) {
    await updateSystemConfigValues(entries)
  }
  if (idsToDelete.length > 0) {
    await db.config.$deleteById(idsToDelete)
  }
}

/**
 * 初始化应用配置
 */
export async function initConfig() {
  // 迁移旧版配置（一段时间后移除）
  await _migrateSystemConfigKeys()

  // 清理无效和重复配置
  await cleanInvalidConfigs()
  // 初始化用户配置
  await initUserConfig()
  // 初始化运行时配置
  await initRuntimeConfig()
  // 初始化 CLI 配置
  await initCliConfig()
  // 初始化系统全局配置
  await initSystemConfig()
  // logger.info('初始化应用配置完成')

  // 重新查询并返回完整配置对象
  // return await getFullConfig()
}
