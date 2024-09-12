const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')

const innerApp = express()
const innerServer = require('http').createServer(innerApp)

// gzip压缩
innerApp.use(compression({
  level: 6,
  filter: shouldCompress,
}))

function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    return false
  }
  return compression.filter(req, res)
}
innerApp.use('*', require('cors')())
innerApp.use(bodyParser.json({
  limit: '50mb',
}))
innerApp.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true,
}))
innerApp.use('/inner/cron', require('./api/cron').InnerAPI)

innerServer.listen(15678, '127.0.0.1', () => {
  console.log('Arcadia Inner Server is running...')
})
