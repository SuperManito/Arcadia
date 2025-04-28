import { createServer } from 'node:http'
import { initAppConfig } from './file'
import { initCronJob } from './cron'
import { initSocketServer, socketCommon } from './socket'
import { apiAuthentication, registerApp } from './server'

// 初始化应用配置
initAppConfig()

// 初始化定时任务
initCronJob()

// 注册应用服务
const app = registerApp()
const server = createServer(app)
socketCommon.setSocket(initSocketServer(server, apiAuthentication))

// 启动服务
server.listen(5678, '0.0.0.0', () => {
  console.log('Arcadia server is running...')
})
