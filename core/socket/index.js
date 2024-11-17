const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { logger } = require('../logger')
const { getJsonFile } = require('../file')
const { APP_FILE_TYPE } = require('../type')
const authConfig = getJsonFile(APP_FILE_TYPE.AUTH)
const jwtSecret = authConfig.jwtSecret
const getToken = function fromHeaderOrQuerystring(request) {
  if (request.headers.authorization && request.headers.authorization.split(' ')[0] === 'Bearer') {
    return request.headers.authorization.split(' ')[1]
  }
  else if (request.query && request.query.token) {
    return request.query.token
  }
  return null
}

module.exports = (server, sessionMiddleware) => {
  const io = new Server(server, {
    cors: true,
    path: '/api/ws',
  })

  // convert a connect middleware to a Socket.IO middleware
  const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next)

  io.use(wrap(sessionMiddleware))

  // only allow authenticated users
  io.use((socket, next) => {
    const token = getToken(socket.request)
    if (token) {
      jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
          next(new Error('unauthorized'))
        }
        else {
          socket.request.user = decoded
          next()
        }
      })
    }
    else {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (_socket) => {
    // const user = socket.request.user
    logger.info('用户已建立 WebSocket 连接')
  })
  return io
}
