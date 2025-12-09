import { Secret, TOTP } from 'otpauth'
import { getUserConfigValue, updateUserConfigValue } from './index'
import { ConfigKeyUser } from '../type/config'

/**
 * TOTP 设置结果
 */
export interface TOTPSetupResult {
  totpSecret: string // Base32 编码的 TOTP 密钥
  otpauthUrl: string // otpauth:// URI（前端用于生成 QR 码）
}

/**
 * 生成 TOTP 密钥和 otpauth URI
 * @param username 用户名
 * @param issuer 发行者名称
 * @returns TOTP 设置信息
 */
export async function generateTOTPSecret(
  username: string,
  issuer: string = 'Arcadia',
): Promise<TOTPSetupResult> {
  // 生成随机密钥（160 位 = 20 字节）
  const secret = new Secret({ size: 20 })

  // 创建 TOTP 对象
  const totp = new TOTP({
    issuer,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })

  // 生成 otpauth:// URI（前端使用此 URI 生成 QR 码）
  const otpauthUrl = totp.toString()

  return {
    totpSecret: secret.base32,
    otpauthUrl,
  }
}

/**
 * 验证 TOTP 动态码（核心业务方法）
 * @param code 用户输入的 6 位数字（number 类型，已校验）
 * @param secret Base32 编码的 TOTP 密钥
 * @param window 时间窗口容错（默认 1 = ±30 秒）
 * @returns 是否验证通过
 */
export function verifyTOTPCode(
  code: number,
  secret: string,
  window: number = 1,
): boolean {
  try {
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    })

    // 将 number 转为字符串传给 TOTP 库
    const delta = totp.validate({ token: ''.concat(String(code)), window })
    return delta !== null
  }
  catch {
    return false
  }
}

/**
 * 检查当前用户是否启用了 TOTP
 * @returns 是否启用
 */
export async function isTOTPEnabled(): Promise<boolean> {
  try {
    const enabled = await getUserConfigValue(ConfigKeyUser.TOTP_ENABLED)
    return enabled === 'true'
  }
  catch {
    return false
  }
}

/**
 * 获取当前用户的 TOTP 密钥
 * @returns Base32 编码的密钥，未设置则返回空字符串
 */
export async function getTOTPSecret(): Promise<string> {
  try {
    return await getUserConfigValue(ConfigKeyUser.TOTP_SECRET)
  }
  catch {
    return ''
  }
}

/**
 * 保存 TOTP 密钥
 * @param secret Base32 编码的密钥
 */
export async function saveTOTPSecret(secret: string) {
  return await updateUserConfigValue(ConfigKeyUser.TOTP_SECRET, secret)
}

/**
 * 启用 TOTP
 */
export async function enableTOTP() {
  return await updateUserConfigValue(ConfigKeyUser.TOTP_ENABLED, 'true')
}

/**
 * 禁用 TOTP
 */
export async function disableTOTP() {
  return await updateUserConfigValue(ConfigKeyUser.TOTP_ENABLED, 'false')
}

/**
 * 验证用户的 TOTP 动态码（自动读取数据库中的密钥）
 * @param code 用户输入的 6 位数字（number 类型，已校验）
 * @returns 是否验证通过
 */
export async function verifyUserTOTPCode(code: number): Promise<boolean> {
  const secret = await getTOTPSecret()
  if (!secret) {
    return false
  }
  return verifyTOTPCode(code, secret)
}
