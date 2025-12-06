import type { config as ConfigModel } from '@prisma/client'

/**
 * 配置模块枚举
 */
export enum ConfigModule {
  RUNTIME = 'runtime', // 运行时配置
  USER = 'user', // 单用户认证
}

/**
 * 运行时配置键枚举
 */
export enum RuntimeConfigKey {
  JWT_SECRET = 'jwtSecret',
  OPEN_API_TOKEN = 'openApiToken',
}

/**
 * 用户配置键枚举
 */
export enum UserConfigKey {
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
 * 配置项类型
 */
export type ConfigRecord = ConfigModel

/**
 * 配置更新项
 */
export interface ConfigUpdateItem {
  key: string
  value: string
  module?: string
}

/**
 * 运行时配置
 */
export interface RuntimeConfig {
  jwtSecret: string
  openApiToken: string
}

/**
 * 登录信息接口
 */
export interface LoginInfo {
  loginIp: string
  loginAddress: string
  loginTime: string
}

/**
 * 用户配置（扩展：包含登录信息、验证码和 TOTP）
 */
export interface UserConfig {
  username: string
  password: string
  authErrorCount: number // 认证错误次数
  authErrorTime: number // 认证错误时间戳
  captcha: string // 当前验证码
  lastLoginInfo?: LoginInfo // 上次登录信息
  curLoginInfo?: LoginInfo // 当前登录信息
  totpSecret: string // TOTP 密钥（Base32 编码）
  totpEnabled: boolean // 是否启用双重认证
}

/**
 * 配置映射类型
 */
export type ConfigMap = Record<string, string>

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG_VALUES: Record<ConfigModule, Record<string, string>> = {
  [ConfigModule.RUNTIME]: {
    [RuntimeConfigKey.JWT_SECRET]: '',
    [RuntimeConfigKey.OPEN_API_TOKEN]: '',
  },
  [ConfigModule.USER]: {
    [UserConfigKey.USERNAME]: 'useradmin',
    [UserConfigKey.PASSWORD]: 'passwd',
    [UserConfigKey.AUTH_ERROR_COUNT]: '0',
    [UserConfigKey.AUTH_ERROR_TIME]: '0',
    [UserConfigKey.CAPTCHA]: '',
    [UserConfigKey.LAST_LOGIN_INFO]: '{}',
    [UserConfigKey.CUR_LOGIN_INFO]: '{}',
    [UserConfigKey.TOTP_SECRET]: '',
    [UserConfigKey.TOTP_ENABLED]: 'false',
  },
}
