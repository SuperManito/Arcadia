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
  AUTH_ERROR_COUNT = 'authErrorCount',
  AUTH_ERROR_TIME = 'authErrorTime',
  CAPTCHA = 'captcha',
  LAST_LOGIN_INFO = 'lastLoginInfo',
  CUR_LOGIN_INFO = 'curLoginInfo',
  TOTP_SECRET = 'totpSecret',
  TOTP_ENABLED = 'totpEnabled',
}

/**
 * 运行时配置键枚举
 */
export enum ConfigKeyRuntime {
  JWT_SECRET = 'jwtSecret',
  OPEN_API_TOKEN = 'openApiToken',
}

/**
 * 所有配置键类型
 */
export type ConfigKey = ConfigKeyUser | ConfigKeyRuntime

/**
 * 登录信息
 */
export enum UserLoginInfoDataKey {
  LOGIN_IP = 'loginIp',
  LOGIN_ADDRESS = 'loginAddress',
  LOGIN_TIME = 'loginTime',
}
export interface UserLoginInfo {
  loginIp: string
  loginAddress: string
  loginTime: string
}

/**
 * 配置数据
 */
export interface ConfigDataUser {
  username: string
  password: string
  authErrorCount: number // 认证错误次数
  authErrorTime: number // 认证错误时间戳
  captcha: string // 当前验证码
  lastLoginInfo?: UserLoginInfo // 上次登录信息
  curLoginInfo?: UserLoginInfo // 当前登录信息
  totpSecret: string // TOTP 密钥（Base32 编码）
  totpEnabled: boolean // 是否启用双重认证
}
export interface ConfigDataRuntime {
  jwtSecret: string
  openApiToken: string
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
  [ConfigKeyUser.AUTH_ERROR_COUNT]: '0',
  [ConfigKeyUser.AUTH_ERROR_TIME]: '0',
  [ConfigKeyUser.CAPTCHA]: '',
  [ConfigKeyUser.LAST_LOGIN_INFO]: '{}',
  [ConfigKeyUser.CUR_LOGIN_INFO]: '{}',
  [ConfigKeyUser.TOTP_SECRET]: '',
  [ConfigKeyUser.TOTP_ENABLED]: 'false',
}
export const DEFAULT_RUNTIME_CONFIG_VALUES: Record<ConfigKeyRuntime, string> = {
  [ConfigKeyRuntime.JWT_SECRET]: '',
  [ConfigKeyRuntime.OPEN_API_TOKEN]: '',
}
export const DEFAULT_CONFIG_VALUES: {
  [ConfigModule.RUNTIME]: Record<ConfigKeyRuntime, string>
  [ConfigModule.USER]: Record<ConfigKeyUser, string>
} = {
  [ConfigModule.USER]: DEFAULT_USER_CONFIG_VALUES,
  [ConfigModule.RUNTIME]: DEFAULT_RUNTIME_CONFIG_VALUES,
}
