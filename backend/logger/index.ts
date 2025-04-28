import log4js from 'log4js'
import { APP_DIR_PATH } from '../type'

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

export const logger = log4js.getLogger('MAIN')
