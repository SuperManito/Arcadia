const express = require('express')
const bodyParser = require('body-parser')

const innerApp = express()
const innerServer = require('http').createServer(innerApp)

innerApp.use(bodyParser.json({
  limit: '10mb',
}))
innerApp.use(bodyParser.urlencoded({
  limit: '10mb',
  extended: true,
}))

innerApp.use('/inner/cron', require('./core/api/cron').InnerAPI)

innerServer.listen(15678, '127.0.0.1', () => {
  console.log('Arcadia Inner Server is running...')
})
