import { config as dbConfig } from '../db'
import type { ConfigRecord, LoginInfo, RuntimeConfig, UserConfig } from '../type/config'
import { ConfigModule, DEFAULT_CONFIG_VALUES, RuntimeConfigKey, UserConfigKey } from '../type/config'
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
    jwtSecret: map[RuntimeConfigKey.JWT_SECRET] || '',
    openApiToken: map[RuntimeConfigKey.OPEN_API_TOKEN] || '',
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
    username: map[UserConfigKey.USERNAME] || '',
    password: map[UserConfigKey.PASSWORD] || '',
    authErrorCount: map[UserConfigKey.AUTH_ERROR_COUNT] ? Number(map[UserConfigKey.AUTH_ERROR_COUNT]) : 0,
    authErrorTime: map[UserConfigKey.AUTH_ERROR_TIME] ? Number(map[UserConfigKey.AUTH_ERROR_TIME]) : 0,
    captcha: map[UserConfigKey.CAPTCHA] || '',
    lastLoginInfo: map[UserConfigKey.LAST_LOGIN_INFO] ? JSON.parse(map[UserConfigKey.LAST_LOGIN_INFO]) : undefined,
    curLoginInfo: map[UserConfigKey.CUR_LOGIN_INFO] ? JSON.parse(map[UserConfigKey.CUR_LOGIN_INFO]) : undefined,
  }
}

/**
 * 保存用户配置
 */
export async function saveUserConfig(config: Partial<UserConfig>): Promise<void> {
  const updates: Promise<ConfigRecord>[] = []
  if (config.username !== undefined) {
    updates.push(upsertConfig(UserConfigKey.USERNAME, ConfigModule.USER, config.username))
  }
  if (config.password !== undefined) {
    updates.push(upsertConfig(UserConfigKey.PASSWORD, ConfigModule.USER, config.password))
  }
  await Promise.all(updates)
}

/**
 * 更新认证错误信息
 */
export async function updateAuthError(count: number, time: number): Promise<void> {
  await Promise.all([
    upsertConfig(UserConfigKey.AUTH_ERROR_COUNT, ConfigModule.USER, String(count)),
    upsertConfig(UserConfigKey.AUTH_ERROR_TIME, ConfigModule.USER, String(time)),
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
  await upsertConfig(UserConfigKey.CAPTCHA, ConfigModule.USER, captcha)
}

/**
 * 更新登录信息
 */
export async function updateLoginInfo(loginInfo: LoginInfo): Promise<void> {
  const userConfig = await getUserConfig()
  const updates: Promise<ConfigRecord>[] = []

  // 将当前登录信息存为上次登录信息
  if (userConfig.curLoginInfo) {
    updates.push(upsertConfig(UserConfigKey.LAST_LOGIN_INFO, ConfigModule.USER, JSON.stringify(userConfig.curLoginInfo)))
  }
  // 保存新的当前登录信息
  updates.push(upsertConfig(UserConfigKey.CUR_LOGIN_INFO, ConfigModule.USER, JSON.stringify(loginInfo)))

  await Promise.all(updates)
}

/**
 * 初始化配置系统
 *
 * @description 清理无效的 module 和 key，初始化所有必需配置，返回完整配置对象
 */
export async function initConfig(): Promise<{ runtime: RuntimeConfig, user: UserConfig }> {
  // 清理无效配置
  const allConfigs = await dbConfig.findMany()
  const validModules = Object.values(ConfigModule)
  const validKeys: Record<string, string[]> = {
    [ConfigModule.RUNTIME]: Object.values(RuntimeConfigKey),
    [ConfigModule.USER]: Object.values(UserConfigKey),
  }
  const idsToDelete: number[] = []
  for (const config of allConfigs) {
    if (!validModules.includes(config.module as ConfigModule)) {
      idsToDelete.push(config.id)
      continue
    }
    const moduleValidKeys = validKeys[config.module] || []
    if (!moduleValidKeys.includes(config.key)) {
      idsToDelete.push(config.id)
    }
  }
  if (idsToDelete.length > 0) {
    await dbConfig.deleteMany({
      where: { id: { in: idsToDelete } },
    })
  }

  // 初始化运行时配置
  const runtimeConfig = await getRuntimeConfig()
  const runtimeUpdates: Promise<ConfigRecord>[] = []
  if (!isNotEmpty(runtimeConfig.jwtSecret)) {
    const jwtSecret = randomString(32)
    runtimeUpdates.push(upsertConfig(RuntimeConfigKey.JWT_SECRET, ConfigModule.RUNTIME, jwtSecret))
    runtimeConfig.jwtSecret = jwtSecret
  }
  if (!isNotEmpty(runtimeConfig.openApiToken)) {
    const openApiToken = randomString(32)
    runtimeUpdates.push(upsertConfig(RuntimeConfigKey.OPEN_API_TOKEN, ConfigModule.RUNTIME, openApiToken))
    runtimeConfig.openApiToken = openApiToken
  }
  if (runtimeUpdates.length > 0) {
    await Promise.all(runtimeUpdates)
  }

  // 初始化用户配置
  const userConfig = await getUserConfig()
  const userUpdates: Promise<ConfigRecord>[] = []
  if (!isNotEmpty(userConfig.username)) {
    const username = DEFAULT_CONFIG_VALUES[ConfigModule.USER][UserConfigKey.USERNAME]
    userUpdates.push(upsertConfig(UserConfigKey.USERNAME, ConfigModule.USER, username))
    userConfig.username = username
  }
  if (!isNotEmpty(userConfig.password)) {
    const password = DEFAULT_CONFIG_VALUES[ConfigModule.USER][UserConfigKey.PASSWORD]
    userUpdates.push(upsertConfig(UserConfigKey.PASSWORD, ConfigModule.USER, password))
    userConfig.password = password
  }
  if (userUpdates.length > 0) {
    await Promise.all(userUpdates)
  }

  return {
    runtime: runtimeConfig,
    user: userConfig,
  }
}
