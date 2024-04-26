const express = require('express')
const compression = require('compression')
const { expressjwt } = require('express-jwt')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const path = require('path')
const random = require('string-random')
const { legacyCreateProxyMiddleware } = require('http-proxy-middleware')

const { API_STATUS_CODE } = require('./core/http')
const { checkConfigFile, CONFIG_FILE_KEY, getJsonFile, saveNewConf } = require('./core/file')

/**
 * 初始化定时任务
 */
const cronCore = require('./core/cron/core')
cronCore.cronInit()

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
const authConfig = getJsonFile(CONFIG_FILE_KEY.AUTH)
let jwtSecret = authConfig.jwtSecret
if (!jwtSecret || jwtSecret === '') {
  jwtSecret = random(32)
  authConfig.jwtSecret = jwtSecret
  saveNewConf(CONFIG_FILE_KEY.AUTH, authConfig)
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
              res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.NEED_LOGIN.message, API_STATUS_CODE.API.NEED_LOGIN.code))
            } else {
              // JWT 验证成功
              proxyReq.setHeader('Authorization', token) // 将 token 传递给目标服务器
            }
          })
        } else {
          res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.NEED_LOGIN.message, API_STATUS_CODE.API.NEED_LOGIN.code))
        }
      },
    },
  }),
)

// 下方涉及到处理接口认证的中间件函数，请勿随意调整顺序

/**
 * Open Api
 */
const { openAPI, openApiHandler } = require('./api/open')
app.use('/api/open', openApiHandler, openAPI)
app.use('/api/open/notify', openApiHandler, require('./api/notify').OpenAPI)

/**
 * Api
 */
app.use(sessionMiddleware) // JWT 认证中间件
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.NEED_LOGIN.message, API_STATUS_CODE.API.NEED_LOGIN.code))
  } else if (err.name === 'SyntaxError') {
    res.send(API_STATUS_CODE.fail(API_STATUS_CODE.API.SYNTAX_ERROR.message, API_STATUS_CODE.API.SYNTAX_ERROR.code))
  } else {
    next(err)
  }
})
app.use('/api', require('./api/main').mainAPI)
app.use('/api/file', require('./api/file').fileAPI)
app.use('/api/user', require('./api/user').userAPI)
app.use('/api/cron', require('./api/cron').cronAPI)
app.use('/api/common', require('./api/common').commonAPI)
app.use('/api/config', require('./api/config').configAPI)
app.use('/api/env', require('./api/env').API)
// app.use('/api/notify', require('./api/notify').API)

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

checkConfigFile()
server.listen(5678, '0.0.0.0', () => {
  console.log('Arcadia Server is running...')
})
