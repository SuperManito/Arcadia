import type { Config as ConfigModel } from '../db'
import type { ConfigDataUser, UserLoginInfo } from '../type/config'
import { ConfigKeyUser } from '../type/config'
import { getUserModuleConfig, updateUserConfigValue } from './index'
import { isNotEmpty } from '../utils'

/**
 * 保存用户登录凭证
 */
export async function saveUserCredentials(config: Partial<ConfigDataUser>) {
  const updates: Promise<ConfigModel>[] = []
  if (isNotEmpty(config.username)) {
    updates.push(updateUserConfigValue(ConfigKeyUser.USERNAME, config.username as string))
  }
  if (isNotEmpty(config.password)) {
    updates.push(updateUserConfigValue(ConfigKeyUser.PASSWORD, config.password as string))
  }
  await Promise.all(updates)
}

/**
 * 更新认证错误信息
 */
export async function updateAuthError(count: number, time: number) {
  await Promise.all([
    updateUserConfigValue(ConfigKeyUser.AUTH_ERROR_COUNT, String(count)),
    updateUserConfigValue(ConfigKeyUser.AUTH_ERROR_TIME, String(time)),
  ])
}

/**
 * 清空认证错误信息
 */
export async function clearAuthError() {
  await updateAuthError(0, 0)
}

/**
 * 保存验证码
 */
export async function saveCaptcha(captcha: string) {
  await updateUserConfigValue(ConfigKeyUser.CAPTCHA, captcha)
}

/**
 * 更新登录信息
 */
export async function updateLoginInfo(loginInfo: UserLoginInfo) {
  const userConfig = await getUserModuleConfig()
  const updates: Promise<ConfigModel>[] = []
  // 将当前登录信息存为上次登录信息
  if (userConfig.curLoginInfo) {
    updates.push(updateUserConfigValue(ConfigKeyUser.LAST_LOGIN_INFO, JSON.stringify(userConfig.curLoginInfo)))
  }
  // 保存新的当前登录信息
  updates.push(updateUserConfigValue(ConfigKeyUser.CUR_LOGIN_INFO, JSON.stringify(loginInfo)))
  await Promise.all(updates)
}
