import type { Express } from 'express'
import { Buffer } from 'node:buffer'
import express from 'express'
import { generateCaptcha } from 'lemon-captcha'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { setCaptcha, shouldShowCaptcha } from '../core/config/session'

const api: Express = express()

// 验证码宽高的合法范围
const CAPTCHA_WIDTH_MIN = 50
const CAPTCHA_WIDTH_MAX = 400
const CAPTCHA_HEIGHT_MIN = 20
const CAPTCHA_HEIGHT_MAX = 200

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

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
  const { w = '120', h = '48' } = req.query

  const width = clamp(Number.parseInt(w as string, 10) || 120, CAPTCHA_WIDTH_MIN, CAPTCHA_WIDTH_MAX)
  const height = clamp(Number.parseInt(h as string, 10) || 48, CAPTCHA_HEIGHT_MIN, CAPTCHA_HEIGHT_MAX)

  const captcha = generateCaptcha({
    type: 'alpha',
    difficulty: 3, // 5 位字母数字混合
    globalNoise: 2, // 低噪声干扰线
    width,
    height,
  })

  const captchaText = captcha.answer.toString().toLowerCase() // 小写
  setCaptcha(captchaText) // 存储当前验证码

  const base64Data = captcha.image.replace(/^data:image\/svg\+xml;base64,/, '')
  const svgData = Buffer.from(base64Data, 'base64').toString('utf-8')

  res.type('svg')
  res.status(200).send(svgData)
})

export {
  api as API,
}
