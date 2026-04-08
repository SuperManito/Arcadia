import { createServer } from 'node:http'
import { initAppFileSystem } from './server/fileCore'
import { initCronJob } from './core/cron'
import { initDaemonTask } from './core/daemon'
import { initSocketServer, socketCommon } from './server/socket'
import { createApiAuthentication, registerApp } from './server/httpServer'
import { initConfig } from './core/config'
import { initTokenCache as initOpenApiAccessKeyCache } from './api/openApi'
import { initDashboardMonitor } from './core/dashboard'
import { initLog } from './core/log'
import { initTerminalServer } from './server/terminal'
import { initDaemonLogServer } from './server/daemonLog'

async function startServer() {
  // 初始化操作日志持久化
  initLog()

  // 初始化文件系统
  initAppFileSystem()

  // 初始化仪表板监控系统
  await initDashboardMonitor()

  // 初始化 OpenAPI 访问令牌缓存
  await initOpenApiAccessKeyCache()

  // 初始化配置
  await initConfig()

  // 初始化定时任务
  await initCronJob()

  // 初始化守护任务
  await initDaemonTask()

  // 创建 API 认证中间件
  const apiAuthentication = createApiAuthentication()

  // 注册应用服务
  const app = registerApp(apiAuthentication)
  const server = createServer(app)
  const io = initSocketServer(server)
  socketCommon.setSocket(io)

  // 初始化终端命名空间（复用 Socket.IO 认证）
  await initTerminalServer(io)

  // 初始化守护任务日志实时推送命名空间
  initDaemonLogServer(io)

  // 启动服务
  server.listen(5678, '0.0.0.0', async () => {
    console.log('Arcadia server is running on port 5678')
  })
}

startServer()
