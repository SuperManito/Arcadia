const log4js = require('log4js')
const { logPath } = require('../file')

/**
 * 日志组件
 */
log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: {
      type: 'file',
      filename: `${logPath}server.log`,
      layout: {
        type: 'pattern',
        // pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m'
        pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %m',
      },
    },
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: process.env.DEBUG_LOG === 'true' ? 'debug' : 'info',
    },
  },
})

module.exports.logger = log4js.getLogger('MAIN')
