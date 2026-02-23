/**
 * 登录失败次数
 */
let authErrorCount = 0

/**
 * 最后登录失败时间戳
 */
let authErrorTime = 0

/**
 * 当前验证码
 */
let currentCaptcha = ''

/**
 * 获取登录失败次数
 */
export function getAuthErrorCount(): number {
  return authErrorCount
}

/**
 * 获取最后登录失败时间戳
 */
export function getAuthErrorTime(): number {
  return authErrorTime
}

/**
 * 检查是否需要限制登录（登录失败 >= 3 次 且 在 60 秒内）
 */
export function isAuthLimited(curTime: Date): boolean {
  if (authErrorCount >= 3 && authErrorTime) {
    const limitTime = 60 - (curTime.getTime() - authErrorTime) / 1000
    return limitTime > 0
  }
  return false
}

/**
 * 获取当前登录限制剩余时间（秒）
 */
export function getAuthLimitRemainingTime(curTime: Date): number {
  if (authErrorCount >= 3 && authErrorTime) {
    const limitTime = 60 - (curTime.getTime() - authErrorTime) / 1000
    if (limitTime > 0) {
      return Math.floor(limitTime)
    }
  }
  return 0
}

/**
 * 是否需要显示验证码（登录失败 >= 1 次）
 */
export function shouldShowCaptcha(): boolean {
  return authErrorCount >= 1
}

/**
 * 重置登录失败计数
 */
export function resetAuthError(): void {
  authErrorCount = 0
  authErrorTime = 0
}

/**
 * 增加登录失败计数
 */
export function incrementAuthError(timestamp: number): void {
  authErrorCount += 1
  authErrorTime = timestamp
}

/**
 * 设置验证码
 */
export function setCaptcha(captcha: string): void {
  currentCaptcha = captcha.toLowerCase()
}

/**
 * 获取验证码
 */
export function getCaptcha(): string {
  return currentCaptcha
}
