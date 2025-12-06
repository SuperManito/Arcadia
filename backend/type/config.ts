import type { config as ConfigModel } from '@prisma/client'

/**
 * 配置模块枚举
 */
export enum ConfigModule {
  RUNTIME = 'runtime', // 运行时配置
  USER = 'user', // 单用户认证
  APP = 'app', // 应用自定义配置
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
 * 用户配置（扩展：包含登录信息和验证码）
 */
export interface UserConfig {
  username: string
  password: string
  authErrorCount?: number // 认证错误次数
  authErrorTime?: number // 认证错误时间戳
  captcha?: string // 当前验证码
  lastLoginInfo?: LoginInfo // 上次登录信息
  curLoginInfo?: LoginInfo // 当前登录信息
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
    jwtSecret: '',
    openApiToken: '',
  },
  [ConfigModule.USER]: {
    username: 'useradmin',
    password: 'passwd',
    authErrorCount: '0',
    authErrorTime: '0',
    captcha: '',
    lastLoginInfo: '{}',
    curLoginInfo: '{}',
  },
  [ConfigModule.APP]: {},
}
