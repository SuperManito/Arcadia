import type { configModel } from '../../db'
import type { ConfigDataCli, ConfigDataRuntime, ConfigDataUser, ConfigKey } from '../type/config'
import db from '../../db'
import path from 'node:path'
import fs from 'node:fs'
import { getJsonFile } from '../../server/fileCore'
import { APP_DIR_PATH } from '../type'
import {
  ConfigKeyCli,
  ConfigKeyRuntime,
  ConfigKeyUser,
  ConfigModule,
  DEFAULT_CONFIG_VALUES,
} from '../type/config'
import { generateCliConfigSh } from './cli'
import { isNotEmpty, randomString } from '../../utils'
import { logger } from '../../utils/logger'

/**
 * 验证配置键是否有效
 */
function validateConfigFieldKey(key: string, module: ConfigModule): void {
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
  }
  if (!validKeys.includes(key as any)) {
    throw new Error(`无效的配置键: module=${module}, key=${key}`)
  }
}
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
  const configs = await db.config.findMany({
    where: { module },
  })
  const defaultKeys = Object.keys(DEFAULT_CONFIG_VALUES[module])

  // 补充对应模块缺失的配置字段记录
  if (configs.length < defaultKeys.length) {
    const existingKeys = new Set(configs.map(c => c.key))
    const defaultValues = DEFAULT_CONFIG_VALUES[module]
    const allKeys = Object.keys(defaultValues) as ConfigKey[]
    const updates: Promise<configModel>[] = []
    for (const key of allKeys) {
      if (!existingKeys.has(key)) {
        updates.push(updateConfigValue(key, module, defaultValues[key as keyof typeof defaultValues]))
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates)
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

  // 处理默认值并转换数据类型
  for (const key of Object.values(ConfigKeyUser)) {
    const value = map[key] || DEFAULT_CONFIG_VALUES[ConfigModule.USER][key]
    switch (key) {
      case ConfigKeyUser.CRON_TASK_HISTORY_DAYS:
        result[key] = Number(value)
        break
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
export async function getCliModuleConfig() {
  const map = await getModuleConfigMap(ConfigModule.CLI)
  const result = {} as ConfigDataCli

  for (const key of Object.values(ConfigKeyCli)) {
    const value = map[key] ?? DEFAULT_CONFIG_VALUES[ConfigModule.CLI][key]
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
  }
}
export async function getFullConfig() {
  return {
    [ConfigModule.RUNTIME]: await getRuntimeModuleConfig(),
    [ConfigModule.USER]: await getUserModuleConfig(),
    [ConfigModule.CLI]: await getCliModuleConfig(),
  }
}

/**
 * 清理无效和重复的配置记录
 */
async function cleanInvalidConfigs(): Promise<void> {
  const allConfigs = await db.config.findMany()
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
  const updates: Promise<configModel>[] = []
  const defaultUsername = DEFAULT_CONFIG_VALUES[ConfigModule.USER][ConfigKeyUser.USERNAME]
  const defaultPassword = DEFAULT_CONFIG_VALUES[ConfigModule.USER][ConfigKeyUser.PASSWORD]

  // 旧版本认证信息迁移（临时措施，一段时间后移除）
  if (config.username === defaultUsername && config.password === defaultPassword) {
    const oldAuthFilePath = path.join(APP_DIR_PATH.CONFIG, 'auth.json')
    const existsOldAuthFile = fs.existsSync(oldAuthFilePath)
    if (existsOldAuthFile) {
      logger.info('检测到旧版认证配置，尝试迁移用户认证信息')
      try {
        const { user: originalUsername, password: originalPassword } = getJsonFile(oldAuthFilePath)
        const isDefinedUsername = isNotEmpty(originalUsername) && originalUsername !== defaultUsername
        const isDefinedPassword = isNotEmpty(originalPassword) && originalPassword !== defaultPassword
        if (isDefinedUsername || isDefinedPassword) {
          await updateUserConfigValue(ConfigKeyUser.USERNAME, originalUsername)
          await updateUserConfigValue(ConfigKeyUser.PASSWORD, originalPassword)
          logger.info(`旧版本用户认证信息已成功迁移至新配置系统，建议手动删除 ${oldAuthFilePath} 文件`)
        }
      }
      catch (e: any) {
        logger.error('迁移旧版本认证配置失败', e.message || e)
      }
      finally {
        // 重新初始化
        await initUserConfig()
        // eslint-disable-next-line no-unsafe-finally
        return
      }
    }
  }

  // 认证信息为空，设置默认的用户名和密码（新装环境）
  if (!isNotEmpty(config.username)) {
    updates.push(updateUserConfigValue(ConfigKeyUser.USERNAME, defaultUsername))
    config.username = defaultUsername
  }
  if (!isNotEmpty(config.password)) {
    updates.push(updateUserConfigValue(ConfigKeyUser.PASSWORD, defaultPassword))
    config.password = defaultPassword
  }
  if (updates.length > 0) {
    await Promise.all(updates)
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
}

/**
 * 初始化 CLI 功能配置
 */
async function initCliConfig() {
  await getCliModuleConfig()
  await generateCliConfigSh()
}

/**
 * 初始化应用配置
 *
 * @description 清理无效的 module 和 key，初始化所有必需配置，返回完整配置对象
 */
export async function initConfig() {
  // 清理无效和重复配置
  await cleanInvalidConfigs()
  // 初始化用户配置
  await initUserConfig()
  // 初始化运行时配置
  await initRuntimeConfig()
  // 初始化 CLI 配置
  await initCliConfig()
  // 重新查询并返回完整配置对象
  logger.log('初始化应用配置完成')
  return await getFullConfig()
}
