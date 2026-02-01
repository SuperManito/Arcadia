import { createServer } from 'node:http'
import { initAppFileSystem } from './server/fileCore'
import { initCronJob } from './core/cron'
import { initSocketServer, socketCommon } from './server/socket'
import { createApiAuthentication, registerApp } from './server/httpServer'
import { initConfig } from './core/config'
import { initTokenCache as initOpenApiAccessKeyCache } from './api/openApi'
import { initDashboardMonitor } from './core/dashboard'

async function startServer() {
  // 初始化文件系统
  initAppFileSystem()

  // 初始化定时任务
  initCronJob()

  // 初始化仪表板监控系统
  await initDashboardMonitor()

  // 初始化 OpenAPI 访问令牌缓存
  await initOpenApiAccessKeyCache()

  // 初始化配置
  const { runtime: runtimeConfig } = await initConfig()

  // 创建 API 认证中间件
  const apiAuthentication = createApiAuthentication(runtimeConfig.jwtSecret)

  // 注册应用服务
  const app = registerApp(apiAuthentication, runtimeConfig.jwtSecret)
  const server = createServer(app)
  socketCommon.setSocket(initSocketServer(server, runtimeConfig.jwtSecret))

  // 启动服务
  server.listen(5678, '0.0.0.0', async () => {
    console.log('Arcadia server is running on port 5678')
  })
}

startServer()
