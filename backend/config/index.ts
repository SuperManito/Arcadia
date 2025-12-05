import { PrismaClient } from '@prisma/client'
import type { ConfigModule, ConfigRecord, RuntimeConfig, UserConfig } from '../type/config'
import { DEFAULT_CONFIG_VALUES, ConfigModule as Module } from '../type/config'
import { isNotEmpty, randomString } from '../utils'

const prisma = new PrismaClient()

/**
 * 根据 key 和 module 查询配置值
 */
export async function getConfigValue(key: string, module: ConfigModule | string): Promise<string> {
  const config = await prisma.config.findFirst({
    where: { key, module },
  })
  if (!config) {
    throw new Error('配置项不存在')
  }
  return config.value
}

/**
 * 更新单个配置
 */
export async function updateConfig(key: string, value: string): Promise<ConfigRecord> {
  return await prisma.config.update({
    where: { key },
    data: { value: String(value) },
  })
}

/**
 * 创建或更新配置
 */
async function upsertConfig(key: string, module: ConfigModule | string, value: string): Promise<ConfigRecord> {
  return await prisma.config.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, module, value: String(value) },
  })
}

/**
 * 获取运行时配置（类型化）
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const configs = await prisma.config.findMany({
    where: { module: Module.RUNTIME },
  })

  const configMap = configs.reduce((map, config) => {
    map[config.key] = config.value
    return map
  }, {} as Record<string, string>)

  return {
    jwtSecret: configMap.jwtSecret || '',
    openApiToken: configMap.openApiToken || '',
  }
}

/**
 * 获取用户配置（类型化）
 */
export async function getUserConfig(): Promise<UserConfig> {
  const configs = await prisma.config.findMany({
    where: { module: Module.USER },
  })

  const configMap = configs.reduce((map, config) => {
    map[config.key] = config.value
    return map
  }, {} as Record<string, string>)

  return {
    username: configMap.username || '',
    password: configMap.password || '',
  }
}

/**
 * 保存用户配置
 */
export async function saveUserConfig(config: Partial<UserConfig>): Promise<void> {
  const updates: Promise<ConfigRecord>[] = []

  if (config.username !== undefined) {
    updates.push(upsertConfig('username', Module.USER, config.username))
  }
  if (config.password !== undefined) {
    updates.push(upsertConfig('password', Module.USER, config.password))
  }

  await Promise.all(updates)
}

/**
 * 初始化运行时配置
 *
 * @description 自动生成缺失的 JWT 密钥和 OpenAPI Token
 */
export async function initRuntimeConfig(): Promise<RuntimeConfig> {
  const config = await getRuntimeConfig()
  const updates: Promise<ConfigRecord>[] = []

  if (!isNotEmpty(config.jwtSecret)) {
    const jwtSecret = randomString(32)
    updates.push(upsertConfig('jwtSecret', Module.RUNTIME, jwtSecret))
    config.jwtSecret = jwtSecret
  }
  if (!isNotEmpty(config.openApiToken)) {
    const openApiToken = randomString(32)
    updates.push(upsertConfig('openApiToken', Module.RUNTIME, openApiToken))
    config.openApiToken = openApiToken
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }

  return config
}

/**
 * 初始化用户配置
 */
export async function initUserConfig(): Promise<UserConfig> {
  const config = await getUserConfig()
  const updates: Promise<ConfigRecord>[] = []

  if (!isNotEmpty(config.username)) {
    const username = DEFAULT_CONFIG_VALUES[Module.USER].username
    updates.push(upsertConfig('username', Module.USER, username))
    config.username = username
  }
  if (!isNotEmpty(config.password)) {
    const password = DEFAULT_CONFIG_VALUES[Module.USER].password
    updates.push(upsertConfig('password', Module.USER, password))
    config.password = password
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }

  return config
}
