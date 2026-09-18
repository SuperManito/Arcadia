import type { ConfigDataUser } from '../type/config'
import { Buffer } from 'node:buffer'
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { ConfigKeyUser, DEFAULT_USER_CONFIG_VALUES } from '../type/config'
import { updateUserConfigValues } from './index'
import { isNotEmpty } from '../../utils'

const HASH_PREFIX = 'pbkdf2:'
const PBKDF2_ITERATIONS = 10000
const PBKDF2_KEY_LENGTH = 32 // 32 bytes = 256 bits

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
  const salt = randomBytes(16)
  const hash = pbkdf2Sync(plaintext, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha256')
  return `${HASH_PREFIX}${PBKDF2_ITERATIONS}:${salt.toString('hex')}:${hash.toString('hex')}`
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
    const iterations = Number.parseInt(parts[1], 10)
    if (!Number.isSafeInteger(iterations) || iterations <= 0) {
      return { valid: false, needsMigration: false }
    }
    const saltHex = parts[2]
    if (!/^[0-9a-f]+$/i.test(saltHex)) {
      return { valid: false, needsMigration: false }
    }
    const expectedHash = parts[3]
    try {
      const salt = Buffer.from(saltHex, 'hex')
      const actualHash = pbkdf2Sync(plaintext, salt, iterations, PBKDF2_KEY_LENGTH, 'sha256').toString('hex')
      return { valid: actualHash === expectedHash, needsMigration: false }
    }
    catch {
      return { valid: false, needsMigration: false }
    }
  }
  else {
    return { valid: plaintext === stored, needsMigration: true }
  }
}

/**
 * 保存用户登录凭证
 */
export async function saveUserCredentials(config: Partial<ConfigDataUser>) {
  const entries: Array<{ key: ConfigKeyUser, value: string }> = []
  if (isNotEmpty(config.username)) {
    entries.push({ key: ConfigKeyUser.USERNAME, value: config.username as string })
  }
  if (isNotEmpty(config.password)) {
    entries.push({ key: ConfigKeyUser.PASSWORD, value: hashPassword(config.password as string) })
  }
  if (entries.length > 0) {
    await updateUserConfigValues(entries)
  }
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
