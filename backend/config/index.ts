import { config as dbConfig } from '../db'
import type { ConfigRecord, LoginInfo, RuntimeConfig, UserConfig } from '../type/config'
import { ConfigModule, DEFAULT_CONFIG_VALUES } from '../type/config'
import { isNotEmpty, randomString } from '../utils'

/**
 * 根据 key 和 module 查询配置值
 */
export async function getConfigValue(key: string, module: ConfigModule | string): Promise<string> {
  const config = await dbConfig.findFirst({
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
export async function updateConfig(key: string, value: string, module: ConfigModule | string = ConfigModule.USER): Promise<ConfigRecord> {
  const config = await dbConfig.findFirst({
    where: { key, module },
  })
  if (!config) {
    throw new Error(`配置项不存在: key=${key}, module=${module}`)
  }
  return await dbConfig.update({
    where: { id: config.id },
    data: { value: String(value) },
  })
}

/**
 * 创建或更新配置
 */
async function upsertConfig(key: string, module: ConfigModule | string, value: string): Promise<ConfigRecord> {
  const existing = await dbConfig.findFirst({
    where: { key, module },
  })
  if (existing) {
    return await dbConfig.update({
      where: { id: existing.id },
      data: { value: String(value) },
    })
  }
  else {
    return await dbConfig.create({
      data: { key, module, value: String(value) },
    })
  }
}

/**
 * 获取运行时配置（类型化）
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const configs = await dbConfig.findMany({
    where: { module: ConfigModule.RUNTIME },
  })

  const map = configs.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

  return {
    jwtSecret: map.jwtSecret || '',
    openApiToken: map.openApiToken || '',
  }
}

/**
 * 获取用户配置（类型化）
 */
export async function getUserConfig(): Promise<UserConfig> {
  const configs = await dbConfig.findMany({
    where: { module: ConfigModule.USER },
  })

  const map = configs.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

  return {
    username: map.username || '',
    password: map.password || '',
    authErrorCount: map.authErrorCount ? Number(map.authErrorCount) : 0,
    authErrorTime: map.authErrorTime ? Number(map.authErrorTime) : 0,
    captcha: map.captcha || '',
    lastLoginInfo: map.lastLoginInfo ? JSON.parse(map.lastLoginInfo) : undefined,
    curLoginInfo: map.curLoginInfo ? JSON.parse(map.curLoginInfo) : undefined,
  }
}

/**
 * 保存用户配置
 */
export async function saveUserConfig(config: Partial<UserConfig>): Promise<void> {
  const updates: Promise<ConfigRecord>[] = []

  if (config.username !== undefined) {
    updates.push(upsertConfig('username', ConfigModule.USER, config.username))
  }
  if (config.password !== undefined) {
    updates.push(upsertConfig('password', ConfigModule.USER, config.password))
  }

  await Promise.all(updates)
}

/**
 * 更新认证错误信息
 */
export async function updateAuthError(count: number, time: number): Promise<void> {
  await Promise.all([
    upsertConfig('authErrorCount', ConfigModule.USER, String(count)),
    upsertConfig('authErrorTime', ConfigModule.USER, String(time)),
  ])
}

/**
 * 清空认证错误信息
 */
export async function clearAuthError(): Promise<void> {
  await updateAuthError(0, 0)
}

/**
 * 保存验证码
 */
export async function saveCaptcha(captcha: string): Promise<void> {
  await upsertConfig('captcha', ConfigModule.USER, captcha)
}

/**
 * 更新登录信息
 */
export async function updateLoginInfo(loginInfo: LoginInfo): Promise<void> {
  const userConfig = await getUserConfig()
  const updates: Promise<ConfigRecord>[] = []

  // 将当前登录信息存为上次登录信息
  if (userConfig.curLoginInfo) {
    updates.push(upsertConfig('lastLoginInfo', ConfigModule.USER, JSON.stringify(userConfig.curLoginInfo)))
  }
  // 保存新的当前登录信息
  updates.push(upsertConfig('curLoginInfo', ConfigModule.USER, JSON.stringify(loginInfo)))

  await Promise.all(updates)
}

/**
 * 初始化运行时配置
 * @description 自动生成缺失的 JWT 密钥和 OpenAPI Token
 */
export async function initRuntimeConfig(): Promise<RuntimeConfig> {
  const config = await getRuntimeConfig()
  const updates: Promise<ConfigRecord>[] = []

  if (!isNotEmpty(config.jwtSecret)) {
    const jwtSecret = randomString(32)
    updates.push(upsertConfig('jwtSecret', ConfigModule.RUNTIME, jwtSecret))
    config.jwtSecret = jwtSecret
  }
  if (!isNotEmpty(config.openApiToken)) {
    const openApiToken = randomString(32)
    updates.push(upsertConfig('openApiToken', ConfigModule.RUNTIME, openApiToken))
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
    const username = DEFAULT_CONFIG_VALUES[ConfigModule.USER].username
    updates.push(upsertConfig('username', ConfigModule.USER, username))
    config.username = username
  }
  if (!isNotEmpty(config.password)) {
    const password = DEFAULT_CONFIG_VALUES[ConfigModule.USER].password
    updates.push(upsertConfig('password', ConfigModule.USER, password))
    config.password = password
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }

  return config
}
