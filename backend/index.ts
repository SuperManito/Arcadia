import { createServer } from 'node:http'
import { initAppConfig } from './file'
import { initCronJob } from './cron'
import { initSocketServer, socketCommon } from './socket'
import { registerApp } from './server'
import configService from './service/config'
import { expressjwt } from 'express-jwt'
import type { Request } from 'express'

function getToken(req: Request) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1] as string
  }
  return undefined
}

async function startServer() {
  try {
    // 初始化应用配置
    initAppConfig()

    // 初始化定时任务
    initCronJob()

    // 初始化系统和用户配置
    const sysConfig = await configService.initializeSystemConfigs()
    await configService.initializeUserConfigs()

    const apiAuthentication = expressjwt({
      secret: () => sysConfig.jwtSecret || '',
      algorithms: ['HS256'],
      credentialsRequired: true,
      getToken,
    }).unless({
      path: ['/', '/index.html', '/favicon.ico', '/_app.config.js', /^\/resource\/*/, /^\/assets\/*/, '/api/common/health', '/api/user/auth', '/api/captcha', /^\/api\/captcha\/.*/], // 指定路径不经过 Token 解析
    })

    // 注册应用服务
    const app = registerApp(apiAuthentication, sysConfig)

    const server = createServer(app)
    socketCommon.setSocket(initSocketServer(server, apiAuthentication, sysConfig))

    // 启动服务
    server.listen(5678, '0.0.0.0', async () => {
      console.log('Arcadia server is running on port 5678')
    })
  }
  catch (error) {
    console.error('Failed to start Arcadia server:', error)
    process.exit(1)
  }
}

startServer()
