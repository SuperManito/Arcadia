import { createServer } from 'node:http'
import { initAppFileSystem } from './file'
import { initCronJob } from './cron'
import { initSocketServer, socketCommon } from './socket'
import { createApiAuthentication, registerApp } from './server'
import { initRuntimeConfig, initUserConfig } from './config'

async function startServer() {
  // 初始化文件系统
  initAppFileSystem()

  // 初始化定时任务
  initCronJob()

  // 初始化配置
  const runtimeConfig = await initRuntimeConfig()
  await initUserConfig()

  // 创建 API 认证中间件
  const apiAuthentication = createApiAuthentication(runtimeConfig.jwtSecret)

  // 注册应用服务
  const app = registerApp(apiAuthentication, runtimeConfig.jwtSecret)
  const server = createServer(app)
  socketCommon.setSocket(initSocketServer(server, apiAuthentication, runtimeConfig.jwtSecret))

  // 启动服务
  server.listen(5678, '0.0.0.0', async () => {
    console.log('Arcadia server is running on port 5678')
  })
}

startServer()
