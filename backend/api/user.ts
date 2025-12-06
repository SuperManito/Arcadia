import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE, getClientIP, ip2Address } from '../http'
import { logger } from '../logger'
import jwt from 'jsonwebtoken'
import { dateToString, randomString } from '../utils'
import { clearAuthError, getConfigValue, getUserConfig, saveUserConfig, updateAuthError, updateConfig, updateLoginInfo } from '../config'
import { ConfigModule, DEFAULT_CONFIG_VALUES } from '../type/config'
const api: Express = express()
const apiInner: Express = express()
const errorCount = 1

/**
 * auth
 */
api.post('/auth', async (request, response) => {
  const { username, password, captcha = '' } = request.body
  logger.info(`检测到用户登录行为，尝试登录用户名 ${username}`)
  const userConfig = await getUserConfig()
  const curTime = new Date()
  const authErrorCount = userConfig.authErrorCount || 0

  if (authErrorCount >= 3 && userConfig.authErrorTime) {
    const authErrorTime = userConfig.authErrorTime
    // 判断登录是否间隔一分钟
    const limitTime = 60 - (curTime.getTime() - authErrorTime) / 1000
    if (limitTime > 0) {
      // 累计错误登录次数超过3次锁定1分钟
      response.send(API_STATUS_CODE.failData('认证失败次数过多，请稍后尝试！', {
        showCaptcha: true,
        limitTime: Math.floor(limitTime),
      }))
      return
    }
  }

  const showCaptcha = authErrorCount >= errorCount
  if (captcha === '' && showCaptcha) {
    response.send(API_STATUS_CODE.failData('请输入验证码！', { showCaptcha, limitTime: 0 }))
    return
  }

  const authCaptcha = userConfig.captcha
  if (showCaptcha && captcha.toLowerCase() !== authCaptcha) {
    response.send(API_STATUS_CODE.failData('验证码不正确！', { showCaptcha, limitTime: 0 }))
    return
  }

  if (username && password) {
    if (username === userConfig.username && password === userConfig.password) {
      const result = { token: '', newPwd: '' }
      if (username === 'useradmin' && password === 'passwd') {
        // 如果是默认密码
        const newPassword = randomString(16)
        logger.info(`系统检测到为首次登录，已随机设置一个新的密码：${newPassword}`)
        result.newPwd = newPassword
        await updateConfig('password', newPassword)
      }

      // 清空错误次数
      await clearAuthError()

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

      const jwtSecret = await getConfigValue('jwtSecret', ConfigModule.RUNTIME)
      result.token = jwt.sign({
        username,
      }, jwtSecret, { expiresIn: 3600 * 24 * 3 })

      response.send(API_STATUS_CODE.okData(result))
    }
    else {
      await updateAuthError(authErrorCount + 1, curTime.getTime())
      response.send(API_STATUS_CODE.failData('错误的用户名或密码，请重试', { showCaptcha, limitTime: 0 }))
    }
  }
  else {
    response.send(API_STATUS_CODE.failData('请输入用户名密码！', { showCaptcha, limitTime: 0 }))
  }
})

/**
 * 获取用户信息
 */
api.get('/info', async (_request, response) => {
  const userConfig = await getUserConfig()
  response.send(API_STATUS_CODE.okData({ username: userConfig.username, lastLoginInfo: userConfig.lastLoginInfo || {} }))
})

/**
 * change pwd
 */
api.post('/changePwd', async (request, response) => {
  const username = request.body.username
  const password = request.body.password
  if (username && password) {
    await saveUserConfig({ username, password })
    await updateConfig('openApiToken', randomString(32), ConfigModule.RUNTIME)

    logger.info('用户更改了认证信息，令牌已重置')
    response.send(API_STATUS_CODE.ok('修改成功！'))
  }
  else {
    response.send(API_STATUS_CODE.fail('请输入用户名密码！'))
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
    const userConfig = await getUserConfig()
    const openApiToken = await getConfigValue('openApiToken', ConfigModule.RUNTIME)

    response.send(API_STATUS_CODE.okData({
      username: userConfig.username,
      password: userConfig.password,
      openApiToken,
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
    const data = {
      username: DEFAULT_CONFIG_VALUES[ConfigModule.USER].username,
      password: DEFAULT_CONFIG_VALUES[ConfigModule.USER].password,
    }
    // 重置为默认用户名和密码
    await saveUserConfig(data)
    // 重置 OpenAPI Token
    await updateConfig('openApiToken', randomString(32), ConfigModule.RUNTIME)
    logger.info('用户名和密码已重置为默认值')
    response.send(API_STATUS_CODE.okData(data))
  }
  catch (e: any) {
    logger.error('重置密码失败', e)
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export {
  api as API,
  apiInner as InnerAPI,
}
