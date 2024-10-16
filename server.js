const express = require('express')
const compression = require('compression')
const { expressjwt } = require('express-jwt')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const path = require('path')
const random = require('string-random')
const { legacyCreateProxyMiddleware } = require('http-proxy-middleware')

const { API_STATUS_CODE } = require('./core/http')
const { checkConfigFile, getJsonFile, saveNewConf } = require('./core/file')
const { APP_FILE_TYPE } = require('./core/type')

// 检查配置文件是否存在
checkConfigFile()

/**
 * 初始化定时任务
 */
const CronCore = require('./core/cron/core')
CronCore.cronJobInit()

const app = express()
const server = require('http').createServer(app)

// gzip压缩
app.use(
  compression({
    level: 6,
    filter: shouldCompress,
  }),
)

function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    return false
  }
  return compression.filter(req, res)
}

// 初始化 JWT 密钥
const authConfig = getJsonFile(APP_FILE_TYPE.AUTH)
let jwtSecret = authConfig.jwtSecret
if (!jwtSecret || jwtSecret === '') {
  jwtSecret = random(32)
  authConfig.jwtSecret = jwtSecret
  saveNewConf(APP_FILE_TYPE.AUTH, authConfig)
}
const getToken = function fromHeaderOrQuerystring(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1]
  }
  return null
}
const sessionMiddleware = expressjwt({
  secret: jwtSecret,
  algorithms: ['HS256'],
  credentialsRequired: true,
  getToken,
}).unless({
  path: ['/', '/index.html', '/favicon.ico', '/_app.config.js', /^\/resource\/*/, /^\/assets\/*/, '/api/common/health', '/api/user/auth', '/api/captcha', /^\/api\/captcha\/.*/], // 指定路径不经过 Token 解析
})

app.use('*', require('cors')())
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

/**
 * 基础反爬虫策略
 */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain')
  res.send('User-agent: *\nDisallow: /')
})
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent']
  const bots = ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot']
  if (bots.some((bot) => userAgent.includes(bot))) {
    res.status(403).send('Access denied')
  } else {
    next()
  }
})

/**
 * 设置静态文件目录（前端）
 */
app.use(express.static(path.join(__dirname, 'public')))

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
      proxyReq: (proxyReq, req, res) => {
        const token = req.query && req.query.token ? req.query.token : null
        if (token) {
          jwt.verify(token, jwtSecret, (err, _decoded) => {
            if (err) {
              // JWT 验证失败
              res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.AUTH_FAIL.message, API_STATUS_CODE.API.AUTH_FAIL.code))
            } else {
              // JWT 验证成功
              proxyReq.setHeader('Authorization', token) // 将 token 传递给目标服务器
            }
          })
        } else {
          res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.NO_AUTH.message, API_STATUS_CODE.API.NO_AUTH.code))
        }
      },
    },
  }),
)

// 下方涉及到处理接口认证的中间件函数，不得随意调整顺序

/**
 * OpenAPI
 */
const { ExtraOpenAPI, openApiMiddleware } = require('./core/api/open')
app.use('/api/open/extra', openApiMiddleware, ExtraOpenAPI) // 用户自定义接口
app.use('/api/open/file', openApiMiddleware, require('./core/api/file').OpenAPI)
app.use('/api/open/env', openApiMiddleware, require('./core/api/env').OpenAPI)
app.use('/api/open/cron', openApiMiddleware, require('./core/api/cron').OpenAPI)
// app.use('/api/open/notify', openApiMiddleware, require('./core/api/notify').OpenAPI)
app.use('/api/open/*', (err, req, res, next) => {
  if (err && err?.name === 'SyntaxError') {
    return res.status(400).send(API_STATUS_CODE.fail(API_STATUS_CODE.OPEN_API.SYNTAX_ERROR.message, API_STATUS_CODE.OPEN_API.SYNTAX_ERROR.code))
  }
  next(err)
})
app.use('/api/open/*', (req, res) => {
  return res.status(404).send(API_STATUS_CODE.fail(API_STATUS_CODE.OPEN_API.NOT_FOUND.message, API_STATUS_CODE.OPEN_API.NOT_FOUND.code))
})

/**
 * API
 */
// JWT 认证中间件
app.use(sessionMiddleware, (err, req, res, next) => {
  if (err) {
    let type
    let statusCode
    switch (err?.name) {
      case 'UnauthorizedError':
        if (err.message === 'No authorization token was found') {
          type = 'NO_AUTH'
          statusCode = 401
        } else {
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
    return res.status(statusCode).send(API_STATUS_CODE.fail(API_STATUS_CODE.API[type].message, API_STATUS_CODE.API[type].code))
  } else {
    next()
  }
})
app.use('/api', require('./core/api/main').API)
app.use('/api/file', require('./core/api/file').API)
app.use('/api/user', require('./core/api/user').API)
app.use('/api/env', require('./core/api/env').API)
app.use('/api/cron', require('./core/api/cron').API)
app.use('/api/common', require('./core/api/common').API)
// app.use('/api/notify', require('./core/api/notify').API)
// app.use('/api/config', require('./core/api/config').API)

/**
 * Web Socket 接口
 */
const { setSocket } = require('./core/socket/common')
setSocket(require('./core/socket')(server, sessionMiddleware))

/**
 * 未匹配的路由
 */
app.use('*', (req, res) => {
  res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.SYNTAX_ERROR.message, API_STATUS_CODE.API.SYNTAX_ERROR.code))
})

server.listen(5678, '0.0.0.0', () => {
  console.log('Arcadia Server is running...')
})
