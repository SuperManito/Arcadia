/**
 * 配置模块枚举
 */
export enum ConfigModule {
  RUNTIME = 'runtime', // 运行时配置
  USER = 'user', // 单用户认证
  CLI = 'cli', // CLI 配置
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
 * CLI 配置键枚举
 */
export enum ConfigKeyCli {
  REMOVE_LOG_DAYS_AGO = 'REMOVE_LOG_DAYS_AGO',
  ENABLE_UPDATE_EXTRA = 'ENABLE_UPDATE_EXTRA',
  ENABLE_UPDATE_EXTRA_SYNC_FILE = 'ENABLE_UPDATE_EXTRA_SYNC_FILE',
  UPDATE_EXTRA_SYNC_FILE_URL = 'UPDATE_EXTRA_SYNC_FILE_URL',
  ENABLE_INIT_EXTRA = 'ENABLE_INIT_EXTRA',
  ENABLE_TASK_BEFORE_EXTRA = 'ENABLE_TASK_BEFORE_EXTRA',
  ENABLE_TASK_AFTER_EXTRA = 'ENABLE_TASK_AFTER_EXTRA',
  ENABLE_AUTO_DELETE_REMOTE_FILE = 'ENABLE_AUTO_DELETE_REMOTE_FILE',
  ENABLE_CUSTOM_NOTIFY = 'ENABLE_CUSTOM_NOTIFY',
  RUN_DELAY_MAX_SECONDS = 'RUN_DELAY_MAX_SECONDS',
  DEFAULT_JS_RUNTIME = 'DEFAULT_JS_RUNTIME',
  DEFAULT_TS_RUNTIME = 'DEFAULT_TS_RUNTIME',
  ENABLE_PYTHON_UV = 'ENABLE_PYTHON_UV',
}

/**
 * 所有配置键类型
 */
export type ConfigKey = ConfigKeyUser | ConfigKeyRuntime | ConfigKeyCli

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
export interface ConfigDataCli {
  REMOVE_LOG_DAYS_AGO: string
  ENABLE_UPDATE_EXTRA: string
  ENABLE_UPDATE_EXTRA_SYNC_FILE: string
  UPDATE_EXTRA_SYNC_FILE_URL: string
  ENABLE_INIT_EXTRA: string
  ENABLE_TASK_BEFORE_EXTRA: string
  ENABLE_TASK_AFTER_EXTRA: string
  ENABLE_AUTO_DELETE_REMOTE_FILE: string
  ENABLE_CUSTOM_NOTIFY: string
  RUN_DELAY_MAX_SECONDS: string
  DEFAULT_JS_RUNTIME: string
  DEFAULT_TS_RUNTIME: string
  ENABLE_PYTHON_UV: string
}
export interface ConfigData {
  [ConfigModule.RUNTIME]: ConfigDataRuntime
  [ConfigModule.USER]: ConfigDataUser
  [ConfigModule.CLI]: ConfigDataCli
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
export const DEFAULT_CLI_CONFIG_VALUES: Record<ConfigKeyCli, string> = {
  [ConfigKeyCli.REMOVE_LOG_DAYS_AGO]: '7',
  [ConfigKeyCli.ENABLE_UPDATE_EXTRA]: '',
  [ConfigKeyCli.ENABLE_UPDATE_EXTRA_SYNC_FILE]: '',
  [ConfigKeyCli.UPDATE_EXTRA_SYNC_FILE_URL]: '',
  [ConfigKeyCli.ENABLE_INIT_EXTRA]: '',
  [ConfigKeyCli.ENABLE_TASK_BEFORE_EXTRA]: '',
  [ConfigKeyCli.ENABLE_TASK_AFTER_EXTRA]: '',
  [ConfigKeyCli.ENABLE_AUTO_DELETE_REMOTE_FILE]: '',
  [ConfigKeyCli.ENABLE_CUSTOM_NOTIFY]: '',
  [ConfigKeyCli.RUN_DELAY_MAX_SECONDS]: '300',
  [ConfigKeyCli.DEFAULT_JS_RUNTIME]: 'node',
  [ConfigKeyCli.DEFAULT_TS_RUNTIME]: 'tsx',
  [ConfigKeyCli.ENABLE_PYTHON_UV]: '',
}
export const DEFAULT_CONFIG_VALUES: {
  [ConfigModule.RUNTIME]: Record<ConfigKeyRuntime, string>
  [ConfigModule.USER]: Record<ConfigKeyUser, string>
  [ConfigModule.CLI]: Record<ConfigKeyCli, string>
} = {
  [ConfigModule.USER]: DEFAULT_USER_CONFIG_VALUES,
  [ConfigModule.RUNTIME]: DEFAULT_RUNTIME_CONFIG_VALUES,
  [ConfigModule.CLI]: DEFAULT_CLI_CONFIG_VALUES,
}
