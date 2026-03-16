import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import svgCaptcha from 'svg-captcha'
import { setCaptcha, shouldShowCaptcha } from '../core/config/session'

const api: Express = express()

/**
 * 登录是否显示验证码
 */
api.get('/flag', async (_request, response) => {
  try {
    response.send(API_STATUS_CODE.okData({ showCaptcha: shouldShowCaptcha() }))
  }
  catch {
    response.send(API_STATUS_CODE.okData({ showCaptcha: false }))
  }
})

/**
 * 验证码
 */
api.get('/', async (req, res) => {
  const { w = 120, h = 50, background = '#ffffff' } = req.query
  const options = {
    noise: 2,
    width: Number.parseInt(w as string),
    height: Number.parseInt(h as string),
    color: true,
    size: 5,
    ignoreChars: '0oO1iIltjc',
    background: background as string,
  }
  const captcha = svgCaptcha.create(options)
  const captchaText = captcha.text.toLowerCase() // 小写
  setCaptcha(captchaText) // 存储当前验证码
  res.type('svg')
  res.status(200).send(captcha.data)
})

export {
  api as API,
}
