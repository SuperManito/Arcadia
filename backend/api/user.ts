import type { Express, Request } from 'express'
import express from 'express'
import { API_STATUS_CODE, getClientIP, ip2Address } from '../utils/httpUtil'
import { logger } from '../utils/logger'
import jwt from 'jsonwebtoken'
import { dateToString, randomString } from '../utils'
import { getRuntimeConfigValue, getUserModuleConfig, updateUserConfigValue } from '../core/config'
import { resetUserCredentials, saveUserCredentials, updateLoginInfo } from '../core/config/user'
import {
  disableTOTP,
  enableTOTP,
  generateTOTPSecret,
  getTOTPSecret,
  isTOTPEnabled,
  saveTOTPSecret,
  verifyTOTPCode,
} from '../core/config/totp'
import { ConfigKeyRuntime, ConfigKeyUser, DEFAULT_USER_CONFIG_VALUES } from '../core/type/config'
import {
  getAuthErrorCount,
  getAuthLimitRemainingTime,
  getCaptcha,
  incrementAuthError,
  isAuthLimited,
  resetAuthError,
  shouldShowCaptcha,
} from '../core/config/session'

const api: Express = express()
const apiInner: Express = express()

/**
 * 检查登录限制（是否锁定登录）
 */
async function checkAuthLimit(curTime: Date) {
  if (isAuthLimited(curTime)) {
    return {
      limited: true,
      showCaptcha: true,
      limitTime: getAuthLimitRemainingTime(curTime),
    }
  }
  return { limited: false, showCaptcha: shouldShowCaptcha(), limitTime: 0 }
}

/**
 * 验证图形验证码
 */
function validateCaptcha(captcha: string, showCaptcha: boolean) {
  if (captcha === '' && showCaptcha) {
    return { valid: false, message: '请输入图形验证码！' }
  }
  if (showCaptcha && captcha.toLowerCase() !== getCaptcha()) {
    return { valid: false, message: '图形验证码不正确！' }
  }
  return { valid: true, message: '' }
}

/**
 * 验证用户名和密码
 */
async function validateCredentials(username: string, password: string, userConfig: any, curTime: Date) {
  if (!username || !password) {
    return { valid: false, message: '请输入用户名密码！' }
  }
  if (username !== userConfig.username || password !== userConfig.password) {
    incrementAuthError(curTime.getTime())
    return { valid: false, message: '错误的用户名或密码，请重试' }
  }
  return { valid: true, message: '' }
}

/**
 * 检查 TOTP 动态码格式（API 层数据校验）
 * @param totpCode 必须是字符串类型，避免前导 0 丢失（如 "012345"）
 */
function checkTOTPCodeFormat(totpCode: string):
  | { valid: true, code: string }
  | { valid: false, message: string } {
  if (!totpCode || typeof totpCode !== 'string') {
    return { valid: false, message: '请输入动态验证码' }
  }
  try {
    const codeStr = totpCode.trim()
    if (!/^\d{6}$/.test(codeStr)) {
      return { valid: false, message: '动态验证码须为 6 位数字' }
    }
    return { valid: true, code: ''.concat(codeStr) }
  }
  catch {
    return { valid: false, message: '动态验证码格式错误' }
  }
}

/**
 * 完成登录：生成 JWT Token 并记录登录信息
 */
async function completeLogin(username: string, password: string, request: Request) {
  const result = { token: '', newPwd: '' }
  const curTime = new Date()

  // 检查是否为默认密码，自动生成新密码
  const isDefaultUsername = username === DEFAULT_USER_CONFIG_VALUES[ConfigKeyUser.USERNAME]
  const isDefaultPassword = password === DEFAULT_USER_CONFIG_VALUES[ConfigKeyUser.PASSWORD]
  if (isDefaultUsername && isDefaultPassword) {
    const newPassword = randomString(16)
    logger.info('检测到首次登录，已将密码设置为一个随机的字符串')
    result.newPwd = newPassword
    await updateUserConfigValue(ConfigKeyUser.PASSWORD, newPassword)
  }

  // 记录本次登录信息
  await ip2Address(getClientIP(request)).then(async ({ ip, address }) => {
    await updateLoginInfo({
      loginIp: ip,
      loginAddress: address,
      loginTime: dateToString(curTime),
    })
    if (ip !== '127.0.0.1' && ip !== 'localhost') {
      logger.info(`用户 ${username} 已登录，登录地址：${ip} ${address}`)
    }
  })

  // 生成 JWT Token
  const jwtSecret = await getRuntimeConfigValue(ConfigKeyRuntime.JWT_SECRET)
  result.token = jwt.sign({ username }, jwtSecret, { expiresIn: 3600 * 24 * 3 })

  return result
}

/**
 * 登录接口
 */
api.post('/auth', async (request, response) => {
  const { username, password, captcha = '' } = request.body
  const clientIP = getClientIP(request)
  const curTime = new Date()

  // 响应数据模板
  const responseData: Record<string, any> = {
    token: '',
    newPwd: '',
    showCaptcha: false,
    limitTime: 0,
    requireTwoFactor: false,
  }

  // 检查登录限制
  const limitCheck = await checkAuthLimit(curTime)
  responseData.showCaptcha = limitCheck.showCaptcha
  responseData.limitTime = limitCheck.limitTime
  if (limitCheck.limited) {
    return response.send(API_STATUS_CODE.failData('认证失败次数过多，请稍后尝试！', responseData))
  }

  // 验证图形验证码
  const captchaCheck = validateCaptcha(captcha, limitCheck.showCaptcha)
  if (!captchaCheck.valid) {
    responseData.limitTime = 0
    return response.send(API_STATUS_CODE.failData(captchaCheck.message, responseData))
  }

  const userConfig = await getUserModuleConfig()

  // 验证用户名和密码
  const credentialsCheck = await validateCredentials(username, password, userConfig, curTime)
  if (!credentialsCheck.valid) {
    logger.warn('登录认证失败', { username, ip: clientIP, reason: credentialsCheck.message, attemptCount: getAuthErrorCount() })
    responseData.limitTime = 0
    return response.send(API_STATUS_CODE.failData(credentialsCheck.message, responseData))
  }

  // 清空错误次数
  resetAuthError()

  // 检查是否启用了 2FA
  const totpEnabled = await isTOTPEnabled()
  if (totpEnabled) {
    responseData.requireTwoFactor = true
    return response.send(API_STATUS_CODE.okData(responseData))
  }

  // 未启用 2FA，直接完成登录
  const result = await completeLogin(username, password, request)
  responseData.token = result.token
  responseData.newPwd = result.newPwd
  response.send(API_STATUS_CODE.okData(responseData))
})

/**
 * TOTP 双重认证接口
 */
api.post('/auth/twoFactor', async (request, response) => {
  const { username, password, code, captcha = '' } = request.body
  const clientIP = getClientIP(request)
  const curTime = new Date()

  // 响应数据模板
  const responseData: Record<string, any> = {
    token: '',
    newPwd: '',
    showCaptcha: false,
    limitTime: 0,
  }

  // 检查登录限制
  const limitCheck = await checkAuthLimit(curTime)
  responseData.showCaptcha = limitCheck.showCaptcha
  responseData.limitTime = limitCheck.limitTime
  if (limitCheck.limited) {
    return response.send(API_STATUS_CODE.failData('认证失败次数过多，请稍后尝试！', responseData))
  }

  // 验证图形验证码
  const captchaCheck = validateCaptcha(captcha, limitCheck.showCaptcha)
  if (!captchaCheck.valid) {
    responseData.limitTime = 0
    return response.send(API_STATUS_CODE.failData(captchaCheck.message, responseData))
  }
  const userConfig = await getUserModuleConfig()
  // 验证用户名和密码（防止跳过第一步）
  const credentialsCheck = await validateCredentials(username, password, userConfig, curTime)
  if (!credentialsCheck.valid) {
    logger.warn('登录认证失败 (双重认证)', { username, ip: clientIP, reason: credentialsCheck.message, attemptCount: getAuthErrorCount() + 1 })
    responseData.limitTime = 0
    return response.send(API_STATUS_CODE.failData(credentialsCheck.message, responseData))
  }

  // 检查是否启用了 2FA
  const totpEnabled = await isTOTPEnabled()
  if (!totpEnabled) {
    return response.send(API_STATUS_CODE.fail('未启用双重认证'))
  }

  // 检查 TOTP 动态码格式
  const codeCheck = checkTOTPCodeFormat(code)
  if (!codeCheck.valid) {
    responseData.limitTime = 0
    return response.send(API_STATUS_CODE.failData(codeCheck.message, responseData))
  }

  // 获取用户 TOTP 密钥并验证
  const totpSecret = await getTOTPSecret()
  if (!totpSecret) {
    return response.send(API_STATUS_CODE.fail('未设置双重认证密钥'))
  }
  const isValid = verifyTOTPCode(codeCheck.code, totpSecret)
  if (!isValid) {
    incrementAuthError(curTime.getTime())
    logger.warn('2FA 双重认证失败', { username, ip: clientIP, attemptCount: getAuthErrorCount() })
    responseData.limitTime = 0
    return response.send(API_STATUS_CODE.failData('动态验证码无效', responseData))
  }

  // 清空错误次数
  resetAuthError()
  // 所有验证通过，完成登录
  const result = await completeLogin(username, password, request)
  responseData.token = result.token
  responseData.newPwd = result.newPwd
  response.send(API_STATUS_CODE.okData(responseData))
})

/**
 * 获取用户信息
 */
api.get('/info', async (_request, response) => {
  const userConfig = await getUserModuleConfig()
  response.send(API_STATUS_CODE.okData({ username: userConfig.username, lastLoginInfo: userConfig.lastLoginInfo || {} }))
})

/**
 * change pwd
 */
api.post('/changePwd', async (request, response) => {
  const username = request.body.username
  const password = request.body.password
  if (username && password) {
    await saveUserCredentials({ username, password })
    logger.info('用户更改了认证信息')
    response.send(API_STATUS_CODE.ok('修改成功！'))
  }
  else {
    response.send(API_STATUS_CODE.fail('请输入用户名和密码！'))
  }
})

/**
 * 退出登录
 */
api.get('/logout', (_request, response) => {
  response.send(API_STATUS_CODE.ok())
})

/**
 * 获取用户信息
 */
apiInner.get('/info', async (_request, response) => {
  try {
    const userConfig = await getUserModuleConfig()

    response.send(API_STATUS_CODE.okData({
      lastLoginInfo: userConfig.lastLoginInfo || {},
      curLoginInfo: userConfig.curLoginInfo || {},
    }))
  }
  catch (e: any) {
    logger.error('获取用户信息失败', e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 重置密码
 */
apiInner.post('/resetPwd', async (_request, response) => {
  try {
    // 重置为默认用户名和密码
    const data = await resetUserCredentials()
    logger.info('用户名和密码已重置为默认值')

    // 关闭 2FA
    await disableTOTP()

    response.send(API_STATUS_CODE.okData(data))
  }
  catch (e: any) {
    logger.error('重置密码失败', e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 初始化 TOTP 密钥与 otpauth URL
 */
api.post('/twoFactorAuth/setup', async (request, response) => {
  try {
    const userConfig = await getUserModuleConfig()
    const { issuer = 'Arcadia' } = request.body
    const { totpSecret, otpauthUrl } = await generateTOTPSecret(userConfig.username, issuer)

    response.send(API_STATUS_CODE.okData({
      secret: totpSecret,
      otpauthUrl,
      issuer,
      message: '请使用 Google Authenticator 或 Microsoft Authenticator 扫描二维码',
    }))
  }
  catch (e: any) {
    logger.error('生成 TOTP 失败', e)
    response.send(API_STATUS_CODE.fail(e.message || '生成失败'))
  }
})

/**
 * 验证并启用 TOTP
 */
api.post('/twoFactorAuth/enable', async (request, response) => {
  try {
    const { secret, code } = request.body

    // 校验必填参数
    if (!secret) {
      return response.send(API_STATUS_CODE.fail('请先生成双重认证密钥'))
    }
    if (!code) {
      return response.send(API_STATUS_CODE.fail('请输入动态验证码'))
    }

    const codeCheck = checkTOTPCodeFormat(code)
    if (!codeCheck.valid) {
      return response.send(API_STATUS_CODE.fail(codeCheck.message))
    }

    // 验证 TOTP 动态码
    const isValid = verifyTOTPCode(codeCheck.code, secret)
    if (!isValid) {
      return response.send(API_STATUS_CODE.fail('动态验证码无效'))
    }

    // 验证通过，保存密钥并启用 2FA
    await saveTOTPSecret(secret)
    await enableTOTP()
    logger.info('用户账户已启用双重认证')

    response.send(API_STATUS_CODE.ok('双重认证已启用'))
  }
  catch (e: any) {
    logger.error('启用 TOTP 失败', e)
    response.send(API_STATUS_CODE.fail(e.message || '启用失败'))
  }
})

/**
 * 关闭 TOTP
 */
api.post('/twoFactorAuth/disable', async (_request, response) => {
  try {
    // 检查是否已启用
    const totpEnabled = await isTOTPEnabled()
    if (!totpEnabled) {
      return response.send(API_STATUS_CODE.fail('双重认证未启用'))
    }

    // 关闭 2FA
    await disableTOTP()
    logger.info('用户已关闭双重认证')

    response.send(API_STATUS_CODE.ok('双重认证已关闭'))
  }
  catch (e: any) {
    logger.error('关闭 TOTP 失败', e)
    response.send(API_STATUS_CODE.fail(e.message || '关闭失败'))
  }
})

/**
 * 获取双重认证状态
 */
api.get('/twoFactorAuth/status', async (_request, response) => {
  try {
    const enabled = await isTOTPEnabled()
    response.send(API_STATUS_CODE.okData(enabled))
  }
  catch (e: any) {
    logger.error('获取 TOTP 状态失败', e)
    response.send(API_STATUS_CODE.fail(e.message || '获取失败'))
  }
})

export {
  api as API,
  apiInner as InnerAPI,
}
