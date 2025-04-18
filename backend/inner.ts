import { createServer } from 'node:http'
import { registerInnerApp } from './server/inner'

// 注册应用服务
const innerApp = registerInnerApp()
const innerServer = createServer(innerApp)

// 启动服务
innerServer.listen(15678, '127.0.0.1', () => {
  console.log('Arcadia inner server is running...')
})
