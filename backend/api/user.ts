import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE, getClientIP, ip2Address } from '../http'
import { logger } from '../logger'
import jwt from 'jsonwebtoken'
import { getJsonFile, saveNewConf } from '../file'
import { APP_FILE_TYPE } from '../type'
import { dateToString, randomString } from '../utils'
import configService from '../service/config'
import { DEFAULT_CONFIGS, ModuleEnum, UserConfig } from '../type/config'
const api: Express = express()
const errorCount = 1

/**
 * auth
 */
api.post('/auth', async (request, response) => {
  const { username, password, captcha = '' } = request.body
  logger.info(`检测到用户登录行为，尝试登录用户名 ${username}`)
  const authLog = getJsonFile(APP_FILE_TYPE.AUTH)
  const curTime = new Date()
  let authErrorCount = authLog.authErrorCount || 0
  if (authErrorCount >= 3 && authLog.authErrorTime) {
    const authErrorTime = authLog.authErrorTime
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
    response.send(API_STATUS_CODE.failData('请输入验证码！', { showCaptcha: true }))
    return
  }
  const authCaptcha = authLog.captcha
  if (showCaptcha && captcha.toLowerCase() !== authCaptcha) {
    response.send(API_STATUS_CODE.failData('验证码不正确！', { showCaptcha }))
    return
  }

  if (username && password) {
    const userConfig = await configService.getConfigsByModuleAsClass(ModuleEnum.USER, UserConfig)

    if (username === userConfig.username && password === userConfig.password) {
      const result = { token: '', newPwd: '' }
      if (username === 'useradmin' && password === 'passwd') {
        // 如果是默认密码
        userConfig.password = randomString(16)
        logger.info(`系统检测到为首次登录，已随机设置一个新的密码：${userConfig.password}`)
        result.newPwd = userConfig.password
        await configService.updateConfig(DEFAULT_CONFIGS.USER.password.key, userConfig.password)
      }
      authLog.authErrorCount = 0
      // 记录本次登录信息
      await ip2Address(getClientIP(request)).then(({ ip, address }) => {
        authLog.lastLoginInfo = Object.assign(authLog.curLoginInfo || {}, {})
        authLog.curLoginInfo = {
          loginIp: ip,
          loginAddress: address,
          loginTime: dateToString(curTime),
        }
        if (ip !== '127.0.0.1' && ip !== 'localhost') {
          logger.info(`用户 ${username} 已登录，登录地址：${ip} ${address}`)
        }
        saveNewConf(APP_FILE_TYPE.AUTH, authLog, false)
      })
      const jwtSecret = await configService.getConfigValueByKeyAndModule(DEFAULT_CONFIGS.SYSTEM.jwtSecret.key, ModuleEnum.SYSTEM)
      result.token = jwt.sign({
        username,
      }, jwtSecret, { expiresIn: 3600 * 24 * 3 })
      // 更新配置

      response.send(API_STATUS_CODE.okData(result))
    }
    else {
      authErrorCount++
      authLog.authErrorCount = authErrorCount
      authLog.authErrorTime = curTime.getTime()
      saveNewConf(APP_FILE_TYPE.AUTH, authLog, false)
      response.send(API_STATUS_CODE.fail('错误的用户名或密码，请重试'))
    }
  }
  else {
    response.send(API_STATUS_CODE.fail('请输入用户名密码！'))
  }
})

/**
 * 获取用户信息
 */
api.get('/info', async (_request, response) => {
  const userConfig = await configService.getConfigsByModuleAsClass(ModuleEnum.USER, UserConfig)
  const auth = getJsonFile(APP_FILE_TYPE.AUTH)
  response.send(API_STATUS_CODE.okData({ username: userConfig.username, lastLoginInfo: auth.lastLoginInfo || {} }))
})

/**
 * change pwd
 */
api.post('/changePwd', async (request, response) => {
  const username = request.body.username
  const password = request.body.password
  if (username && password) {
    const userConfig = await configService.getConfigsByModuleAsClass(ModuleEnum.USER, UserConfig)

    userConfig.password = password
    userConfig.username = username
    await configService.saveConfigObject(userConfig, ModuleEnum.USER)
    await configService.updateConfig(DEFAULT_CONFIGS.SYSTEM.openApiToken.key, randomString(32))

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

export {
  api as API,
}
