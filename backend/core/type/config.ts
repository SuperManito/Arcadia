/**
 * 配置模块枚举
 */
export enum ConfigModule {
  RUNTIME = 'runtime', // 运行时配置
  USER = 'user', // 单用户认证
}

/**
 * 用户配置键枚举
 */
export enum ConfigKeyUser {
  USERNAME = 'username',
  PASSWORD = 'password',
  TOTP_SECRET = 'totpSecret',
  TOTP_ENABLED = 'totpEnabled',
  CRON_TASK_HISTORY_DAYS = 'cronTaskHistoryDays',
}

/**
 * 运行时配置键枚举
 */
export enum ConfigKeyRuntime {
  JWT_SECRET = 'jwtSecret',
}

/**
 * 所有配置键类型
 */
export type ConfigKey = ConfigKeyUser | ConfigKeyRuntime

/**
 * 配置数据
 */
export interface ConfigDataUser {
  username: string
  password: string
  totpSecret: string // TOTP 密钥（Base32 编码）
  totpEnabled: boolean // 是否启用双重认证
  cronTaskHistoryDays: number // 仪表板数据保留天数
}
export interface ConfigDataRuntime {
  jwtSecret: string
}
export interface ConfigData {
  [ConfigModule.RUNTIME]: ConfigDataRuntime
  [ConfigModule.USER]: ConfigDataUser
}

/**
 * 默认配置值
 */
export const DEFAULT_USER_CONFIG_VALUES: Record<ConfigKeyUser, string> = {
  [ConfigKeyUser.USERNAME]: 'useradmin',
  [ConfigKeyUser.PASSWORD]: 'passwd',
  [ConfigKeyUser.TOTP_SECRET]: '',
  [ConfigKeyUser.TOTP_ENABLED]: 'false',
  [ConfigKeyUser.CRON_TASK_HISTORY_DAYS]: '7',
}
export const DEFAULT_RUNTIME_CONFIG_VALUES: Record<ConfigKeyRuntime, string> = {
  [ConfigKeyRuntime.JWT_SECRET]: '',
}
export const DEFAULT_CONFIG_VALUES: {
  [ConfigModule.RUNTIME]: Record<ConfigKeyRuntime, string>
  [ConfigModule.USER]: Record<ConfigKeyUser, string>
} = {
  [ConfigModule.USER]: DEFAULT_USER_CONFIG_VALUES,
  [ConfigModule.RUNTIME]: DEFAULT_RUNTIME_CONFIG_VALUES,
}
