const log4js = require('log4js')
const { APP_DIR_PATH } = require('../type')

/**
 * 日志组件
 */
log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: {
      type: 'file',
      filename: `${APP_DIR_PATH.LOG}/server.log`,
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
