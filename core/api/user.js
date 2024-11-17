const express = require('express')
const api = express()
const { API_STATUS_CODE, getClientIP, ip2Address } = require('../http')
const { logger } = require('../logger')

const random = require('string-random')
const jwt = require('jsonwebtoken')
const { saveNewConf, getJsonFile } = require('../file')
const { APP_FILE_TYPE } = require('../type')
const util = require('../utils')
const errorCount = 1

/**
 * auth
 */
api.post('/auth', async (request, response) => {
  const { username, password, captcha = '' } = request.body
  logger.info(`检测到用户登录行为，尝试登录用户名 ${username}`)
  const con = getJsonFile(APP_FILE_TYPE.AUTH)
  const curTime = new Date()
  let authErrorCount = con.authErrorCount || 0
  if (authErrorCount >= 3 && con.authErrorTime) {
    const authErrorTime = con.authErrorTime
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
  const authCaptcha = con.captcha
  if (showCaptcha && captcha.toLowerCase() !== authCaptcha) {
    response.send(API_STATUS_CODE.failData('验证码不正确！', { showCaptcha }))
    return
  }
  if (username && password) {
    if (username === con.user && password === con.password) {
      const result = { token: 0, newPwd: '' }
      if (username === 'useradmin' && password === 'passwd') {
        // 如果是默认密码
        con.password = random(16)
        logger.info(`系统检测到为首次登录，已随机设置一个新的密码：${con.password}`)
        result.newPwd = con.password
      }
      con.authErrorCount = 0
      // 记录本次登录信息
      await ip2Address(getClientIP(request)).then(({ ip, address }) => {
        con.lastLoginInfo = Object.assign(con.curLoginInfo || {}, {})
        con.curLoginInfo = {
          loginIp: ip,
          loginAddress: address,
          loginTime: util.dateToString(curTime),
        }
        if (ip !== '127.0.0.1' && ip !== 'localhost') {
          logger.info(`用户 ${username} 已登录，登录地址：${ip} ${address}`)
        }
        saveNewConf(APP_FILE_TYPE.AUTH, con, false)
      })
      result.token = jwt.sign({
        username,
      }, con.jwtSecret, { expiresIn: 3600 * 24 * 3 })
      response.send(API_STATUS_CODE.okData(result))
    }
    else {
      authErrorCount++
      con.authErrorCount = authErrorCount
      con.authErrorTime = curTime.getTime()
      saveNewConf(APP_FILE_TYPE.AUTH, con, false)
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
api.get('/info', (request, response) => {
  const con = getJsonFile(APP_FILE_TYPE.AUTH)
  response.send(API_STATUS_CODE.okData({ username: con.user, lastLoginInfo: con.lastLoginInfo || {} }))
})

/**
 * change pwd
 */
api.post('/changePwd', (request, response) => {
  const username = request.body.username
  const password = request.body.password
  if (username && password) {
    const config = getJsonFile(APP_FILE_TYPE.AUTH)
    // 如果不是默认用户和密码，重置令牌
    // const originUser = config.user
    // const originPwd = config.password
    // if (originUser !== 'useradmin' && originPwd !== 'passwd') {
    //   config.jwtSecret = random(32)
    // }
    // 重置开放接口令牌
    config.openApiToken = random(32)
    config.password = password
    config.user = username
    saveNewConf(APP_FILE_TYPE.AUTH, config, true)
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
api.get('/logout', (request, response) => {
  response.send(API_STATUS_CODE.ok())
})

module.exports = {
  API: api,
}
