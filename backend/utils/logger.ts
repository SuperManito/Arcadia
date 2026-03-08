import log4js from 'log4js'
import { APP_DIR_PATH } from '../core/type'

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

const _logger = log4js.getLogger('MAIN')

const LOG_METHODS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'log'] as const

type DbLogHandler = (type: string, content: string) => void
let _dbHandler: DbLogHandler | null = null

export function setLogDbHandler(handler: DbLogHandler) {
  _dbHandler = handler
}

function formatLogArgs(args: any[]): string {
  return args.map((arg) => {
    if (typeof arg === 'string')
      return arg
    if (arg instanceof Error)
      return arg.stack || arg.message
    try {
      return JSON.stringify(arg)
    }
    catch {
      return String(arg)
    }
  }).join(' ')
}

export const logger = new Proxy(_logger, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && (LOG_METHODS as readonly string[]).includes(prop)) {
      return (...args: any[]) => {
        (target as any)[prop](...args)
        if (_dbHandler) {
          const content = formatLogArgs(args)
          const type = prop === 'log' ? 'info' : prop
          _dbHandler(type, content)
        }
      }
    }
    return Reflect.get(target, prop, receiver)
  },
}) as typeof _logger
