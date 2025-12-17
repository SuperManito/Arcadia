import { PrismaClient } from 'generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { withMyFunc } from './myfunc'
import { logger } from '../../utils/logger'

export type * from './myfunc'
export type * from 'generated/prisma/models'

const debug = process.env.ARCADIA_SQL_DEBUG === 'true'
const _prisma = new PrismaClient({
  log: debug
    ? [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ]
    : undefined,
  adapter: new PrismaBetterSqlite3({ url: '../../config/config.db' }),
})

export const prisma = _prisma.$extends(withMyFunc())

if (debug) {
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  _prisma.$on('query', (e: any) => {
    logger.log(`SQL(${(e.duration as number).toFixed(1)}ms): ${e.query}; ${e.params}`)
  })
}
