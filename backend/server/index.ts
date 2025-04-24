import type { ErrorRequestHandler, Express, Request, RequestHandler, Response, Router } from 'express'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { expressjwt } from 'express-jwt'
import type { VerifyCallback } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import bodyParser from 'body-parser'
import { legacyCreateProxyMiddleware } from 'http-proxy-middleware'

import { isNotEmpty, randomString } from '../utils'
import { API_STATUS_CODE } from '../http'
import { getJsonFile, saveNewConf } from '../file'
import { APP_FILE_TYPE, APP_PUBLIC_DIR } from '../type'
import { OpenAPIAuthentication, OpenAPIExtra } from '../api/open'
import { API as ApiFile, OpenAPI as OpenApiFile } from '../api/file'
import { API as ApiEnv, OpenAPI as OpenApiEnv } from '../api/env'
import { API as ApiCron, OpenAPI as OpenApiCron } from '../api/cron'
import { API as ApiMessage, OpenAPI as OpenApiMessage } from '../api/message'
import { API as ApiMain } from '../api/main'
import { API as ApiUser } from '../api/user'
import { API as ApiCommon } from '../api/common'

// 初始化 JWT 密钥
const authConfig = getJsonFile(APP_FILE_TYPE.AUTH)
let jwtSecret = authConfig.jwtSecret
if (!isNotEmpty(jwtSecret)) {
  jwtSecret = randomString(32)
  authConfig.jwtSecret = jwtSecret
  saveNewConf(APP_FILE_TYPE.AUTH, authConfig)
}
function getToken(req: Request) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1] as string
  }
  return undefined
}

export const apiAuthentication = expressjwt({
  secret: jwtSecret,
  algorithms: ['HS256'],
  credentialsRequired: true,
  getToken,
}).unless({
  path: ['/', '/index.html', '/favicon.ico', '/_app.config.js', /^\/resource\/*/, /^\/assets\/*/, '/api/common/health', '/api/user/auth', '/api/captcha', /^\/api\/captcha\/.*/], // 指定路径不经过 Token 解析
})

export function registerApp() {
  const app: Express = express()

  // gzip压缩
  app.use(
    compression({
      level: 6,
      filter: shouldCompress,
    }),
  )

  function shouldCompress(req: Request, res: Response) {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }

  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  )
  app.use(
    bodyParser.json({
      limit: '50mb',
    }),
  )
  app.use(
    bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
    }),
  )

  // 反爬虫策略
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain')
    res.send('User-agent: *\nDisallow: /')
  })
  app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || ''
    const bots = ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot']
    if (bots.some((bot) => userAgent.includes(bot))) {
      res.status(403).send('Access denied')
    }
    else {
      next()
    }
  })

  // 设置静态文件目录（前端）
  app.use(express.static(APP_PUBLIC_DIR))

  /**
   * ttyd 服务映射（需要JWT认证）
   */
  app.use(
    '/api/shell',
    legacyCreateProxyMiddleware({
      target: 'http://127.0.0.1:7685',
      ws: true,
      changeOrigin: true,
      pathRewrite: {
        '^/api/shell': '/',
      },
      on: {
        proxyReq: (proxyReq, req: Request, res: Response) => {
          const token = req.query && req.query.token ? (req.query.token as string) : null
          if (token) {
            jwt.verify(token, jwtSecret, ((err, _decoded) => {
              if (err) {
                // JWT 认证失败
                const { message, code } = API_STATUS_CODE.API.AUTH_FAIL
                res.send(API_STATUS_CODE.fail(message, code))
              }
              else {
                // JWT 认证成功
                proxyReq.setHeader('Authorization', token) // 将 token 传递给目标服务器
              }
            }) as VerifyCallback)
          }
          else {
            const { message, code } = API_STATUS_CODE.API.NO_AUTH
            res.send(API_STATUS_CODE.fail(message, code))
          }
        },
      },
    }),
  )

  /**
   * OpenAPI
   */
  const openApiRouter: Router = express.Router()
  openApiRouter.use('/extra', OpenAPIExtra) // 编程接口
  openApiRouter.use('/file', OpenApiFile)
  openApiRouter.use('/env', OpenApiEnv)
  openApiRouter.use('/cron', OpenApiCron)
  openApiRouter.use('/message', OpenApiMessage)
  app.use('/api/open', OpenAPIAuthentication, openApiRouter)
  const handleOpenApiSyntaxError: ErrorRequestHandler = (err, _req, res, next) => {
    if (err && err?.name === 'SyntaxError') {
      const { message, code } = API_STATUS_CODE.OPEN_API.SYNTAX_ERROR
      res.status(400).send(API_STATUS_CODE.fail(message, code))
    }
    next(err)
  }
  app.use('/api/open/*splat', handleOpenApiSyntaxError)
  app.use('/api/open/*splat', ((_req: Request, res: Response): any => {
    const { message, code } = API_STATUS_CODE.OPEN_API.NOT_FOUND
    return res.status(404).send(API_STATUS_CODE.fail(message, code))
  }) as RequestHandler)

  /**
   * API
   */
  const handleAuthenticationError: ErrorRequestHandler = (err, _req, res, next) => {
    if (err) {
      let type: 'NO_AUTH' | 'AUTH_FAIL' | 'SYNTAX_ERROR' | 'INTERNAL_ERROR'
      let statusCode: 401 | 403 | 400 | 500 | 200
      switch (err?.name) {
        case 'UnauthorizedError':
          if (err.message === 'No authorization token was found') {
            type = 'NO_AUTH'
            statusCode = 401
          }
          else {
            type = 'AUTH_FAIL'
            statusCode = 200
          }
          break
        case 'SyntaxError':
          type = 'SYNTAX_ERROR'
          statusCode = 400
          break
        default:
          type = 'INTERNAL_ERROR'
          statusCode = 500
          break
      }
      const { message, code } = API_STATUS_CODE.API[type]
      res.status(statusCode).send(API_STATUS_CODE.fail(message, code))
    }
    else {
      next()
    }
  }
  const apiRouter: Router = express.Router()
  apiRouter.use('/', ApiMain)
  apiRouter.use('/user', ApiUser)
  apiRouter.use('/file', ApiFile)
  apiRouter.use('/env', ApiEnv)
  apiRouter.use('/cron', ApiCron)
  apiRouter.use('/message', ApiMessage)
  apiRouter.use('/common', ApiCommon)
  app.use('/api', apiAuthentication, handleAuthenticationError, apiRouter)

  /**
   * 未匹配的路由
   */
  app.use(/(.*)/, (_req, res) => {
    const { message, code } = API_STATUS_CODE.API.SYNTAX_ERROR
    res.send(API_STATUS_CODE.fail(message, code))
  })

  return app
}
