import express from 'express'
import bodyParser from 'body-parser'
import http from 'node:http'
import { InnerAPI as innerApiCron } from './api/cron'

const innerApp = express()
const innerServer = http.createServer(innerApp)

innerApp.use(bodyParser.json({
  limit: '10mb',
}))
innerApp.use(bodyParser.urlencoded({
  limit: '10mb',
  extended: true,
}))

innerApp.use('/inner/cron', innerApiCron)

innerServer.listen(15678, '127.0.0.1', () => {
  console.log('Arcadia inner server is running...')
})
