/**
 * 配置模块枚举
 */
export enum ConfigModule {
  RUNTIME = 'runtime', // 运行时配置
  USER = 'user', // 单用户认证
  CLI = 'cli', // CLI 配置
  SYSTEM = 'system', // 系统全局配置
}

/**
 * 用户配置键枚举
 */
export enum ConfigKeyUser {
  USERNAME = 'username',
  PASSWORD = 'password',
  TOTP_SECRET = 'totpSecret',
  TOTP_ENABLED = 'totpEnabled',
}

/**
 * 运行时配置键枚举
 */
export enum ConfigKeyRuntime {
  JWT_SECRET = 'jwtSecret',
  UPDATE_CHECK_LAST_AT = 'updateCheckLastAt',
  UPDATE_CHECK_FAILED_AT = 'updateCheckFailedAt',
  UPDATE_PENDING_COMMIT = 'updatePendingCommit',
  UPDATE_PENDING_TAG = 'updatePendingTag',
  UPDATE_CURRENT_TAG = 'updateCurrentTag',
  UPDATE_CURRENT_COMMIT = 'updateCurrentCommit',
  UPDATE_UPGRADE_PENDING = 'updateUpgradePending',
  UPDATE_NOTIFIED = 'updateNotified',
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
 * 系统配置项枚举
 */
export enum ConfigKeySystem {
  TIMEZONE = 'timezone',
  NPM_REGISTRY = 'npmRegistry',
  PIP_INDEX_URL = 'pipIndexUrl',
  APT_MIRROR_URL = 'aptMirrorUrl',
  GEM_REGISTRY = 'gemRegistry',
  SERVER_LOG_RETENTION_DAYS = 'serverLogRetentionDays',
  LOGIN_LOG_RETENTION_DAYS = 'loginLogRetentionDays',
  OPEN_API_LOG_RETENTION_DAYS = 'openApiLogRetentionDays',
  MESSAGE_RETENTION_DAYS = 'messageRetentionDays',
  TASK_HISTORY_RETENTION_DAYS = 'taskHistoryRetentionDays',
  CLEANUP_CRON_EXPRESSION = 'cleanupCronExpression',
  CLEANUP_CRON_ENABLED = 'cleanupCronEnabled',
}
/**
 * 所有配置键类型
 */
export type ConfigKey = ConfigKeyUser | ConfigKeyRuntime | ConfigKeyCli | ConfigKeySystem

/**
 * 配置数据
 */
export interface ConfigDataUser {
  username: string
  password: string
  totpSecret: string // TOTP 密钥（Base32 编码）
  totpEnabled: boolean // 是否启用双重认证
}
export interface ConfigDataRuntime {
  jwtSecret: string
  updateCheckLastAt: string
  updateCheckFailedAt: string
  updatePendingCommit: string
  updatePendingTag: string
  updateCurrentTag: string
  updateCurrentCommit: string
  updateUpgradePending: string
  updateNotified: string
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
export interface ConfigDataSystem {
  timezone: string
  npmRegistry: string
  pipIndexUrl: string
  aptMirrorUrl: string
  gemRegistry: string
  serverLogRetentionDays: string
  loginLogRetentionDays: string
  openApiLogRetentionDays: string
  messageRetentionDays: string
  taskHistoryRetentionDays: string
  cleanupCronExpression: string
  cleanupCronEnabled: string
}
export interface ConfigData {
  [ConfigModule.RUNTIME]: ConfigDataRuntime
  [ConfigModule.USER]: ConfigDataUser
  [ConfigModule.CLI]: ConfigDataCli
  [ConfigModule.SYSTEM]: ConfigDataSystem
}

/**
 * 默认配置值
 */
export interface DefaultConfigValues {
  [ConfigModule.USER]: Record<ConfigKeyUser, string>
  [ConfigModule.RUNTIME]: Record<ConfigKeyRuntime, string>
  [ConfigModule.CLI]: Record<ConfigKeyCli, string>
  [ConfigModule.SYSTEM]: Record<ConfigKeySystem, string>
}

export const DEFAULT_CONFIG_VALUES: DefaultConfigValues = {
  [ConfigModule.USER]: {
    [ConfigKeyUser.USERNAME]: 'useradmin',
    [ConfigKeyUser.PASSWORD]: 'passwd',
    [ConfigKeyUser.TOTP_SECRET]: '',
    [ConfigKeyUser.TOTP_ENABLED]: 'false',
  },
  [ConfigModule.RUNTIME]: {
    [ConfigKeyRuntime.JWT_SECRET]: '',
    [ConfigKeyRuntime.UPDATE_CHECK_LAST_AT]: '',
    [ConfigKeyRuntime.UPDATE_CHECK_FAILED_AT]: '',
    [ConfigKeyRuntime.UPDATE_PENDING_COMMIT]: '',
    [ConfigKeyRuntime.UPDATE_PENDING_TAG]: '',
    [ConfigKeyRuntime.UPDATE_CURRENT_TAG]: '',
    [ConfigKeyRuntime.UPDATE_CURRENT_COMMIT]: '',
    [ConfigKeyRuntime.UPDATE_UPGRADE_PENDING]: '',
    [ConfigKeyRuntime.UPDATE_NOTIFIED]: '',
  },
  [ConfigModule.CLI]: {
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
  },
  [ConfigModule.SYSTEM]: {
    [ConfigKeySystem.TIMEZONE]: 'Asia/Shanghai',
    [ConfigKeySystem.NPM_REGISTRY]: '',
    [ConfigKeySystem.PIP_INDEX_URL]: '',
    [ConfigKeySystem.APT_MIRROR_URL]: '',
    [ConfigKeySystem.GEM_REGISTRY]: '',
    [ConfigKeySystem.SERVER_LOG_RETENTION_DAYS]: '7',
    [ConfigKeySystem.LOGIN_LOG_RETENTION_DAYS]: '180',
    [ConfigKeySystem.OPEN_API_LOG_RETENTION_DAYS]: '7',
    [ConfigKeySystem.MESSAGE_RETENTION_DAYS]: '7',
    [ConfigKeySystem.TASK_HISTORY_RETENTION_DAYS]: '7',
    [ConfigKeySystem.CLEANUP_CRON_EXPRESSION]: '',
    [ConfigKeySystem.CLEANUP_CRON_ENABLED]: 'true',
  },
}

export const DEFAULT_USER_CONFIG_VALUES = DEFAULT_CONFIG_VALUES[ConfigModule.USER]
export const DEFAULT_RUNTIME_CONFIG_VALUES = DEFAULT_CONFIG_VALUES[ConfigModule.RUNTIME]
export const DEFAULT_CLI_CONFIG_VALUES = DEFAULT_CONFIG_VALUES[ConfigModule.CLI]
export const DEFAULT_SYSTEM_CONFIG_VALUES = DEFAULT_CONFIG_VALUES[ConfigModule.SYSTEM]
