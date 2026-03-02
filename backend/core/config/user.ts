import type { ConfigDataUser, UserLoginInfo } from '../type/config'
import { ConfigKeyUser, DEFAULT_USER_CONFIG_VALUES } from '../type/config'
import { getUserModuleConfig, updateUserConfigValue } from './index'
import { isNotEmpty } from '../../utils'
import type { configModel } from '../../db'
import CryptoJS from 'crypto-js'

const HASH_PREFIX = 'pbkdf2:'
const PBKDF2_ITERATIONS = 10000
const PBKDF2_KEY_SIZE = 8 // 8 words × 32 bits = 256 bits

/**
 * 判断存储的密码值是否已是哈希格式
 */
export function isHashedPassword(stored: string): boolean {
  return stored.startsWith(HASH_PREFIX)
}

/**
 * 对密码进行 PBKDF2 哈希
 * 格式：pbkdf2:<iterations>:<salt_hex>:<hash_hex>
 */
export function hashPassword(plaintext: string): string {
  const salt = CryptoJS.lib.WordArray.random(16)
  const hash = CryptoJS.PBKDF2(plaintext, salt, {
    keySize: PBKDF2_KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  })
  return `${HASH_PREFIX}${PBKDF2_ITERATIONS}:${salt.toString()}:${hash.toString()}`
}

/**
 * 验证明文密码是否与存储值匹配（兼容明文格式）
 */
export function verifyPassword(plaintext: string, stored: string): { valid: boolean, needsMigration: boolean } {
  if (isHashedPassword(stored)) {
    const parts = stored.split(':')
    if (parts.length !== 4) {
      return { valid: false, needsMigration: false }
    }
    const iterations = Number.parseInt(parts[1])
    const salt = CryptoJS.enc.Hex.parse(parts[2])
    const expectedHash = parts[3]
    const actualHash = CryptoJS.PBKDF2(plaintext, salt, {
      keySize: PBKDF2_KEY_SIZE,
      iterations,
      hasher: CryptoJS.algo.SHA256,
    }).toString()
    return { valid: actualHash === expectedHash, needsMigration: false }
  }
  else {
    return { valid: plaintext === stored, needsMigration: true }
  }
}

/**
 * 保存用户登录凭证
 */
export async function saveUserCredentials(config: Partial<ConfigDataUser>) {
  const updates: Promise<configModel>[] = []
  if (isNotEmpty(config.username)) {
    updates.push(updateUserConfigValue(ConfigKeyUser.USERNAME, config.username as string))
  }
  if (isNotEmpty(config.password)) {
    updates.push(updateUserConfigValue(ConfigKeyUser.PASSWORD, hashPassword(config.password as string)))
  }
  await Promise.all(updates)
}

/**
 * 重置用户登录凭证为默认值
 */
export async function resetUserCredentials() {
  const data = {
    username: DEFAULT_USER_CONFIG_VALUES[ConfigKeyUser.USERNAME],
    password: DEFAULT_USER_CONFIG_VALUES[ConfigKeyUser.PASSWORD],
  }
  await saveUserCredentials(data)
  return data
}

/**
 * 更新登录信息
 */
export async function updateLoginInfo(loginInfo: UserLoginInfo) {
  const userConfig = await getUserModuleConfig()
  const updates: Promise<configModel>[] = []
  // 将当前登录信息存为上次登录信息
  if (userConfig.curLoginInfo) {
    updates.push(updateUserConfigValue(ConfigKeyUser.LAST_LOGIN_INFO, JSON.stringify(userConfig.curLoginInfo)))
  }
  // 保存新的当前登录信息
  updates.push(updateUserConfigValue(ConfigKeyUser.CUR_LOGIN_INFO, JSON.stringify(loginInfo)))
  await Promise.all(updates)
}
