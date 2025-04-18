import type { Express } from 'express'
import express from 'express'
import bodyParser from 'body-parser'
import { InnerAPI as innerApiCron } from '../api/cron'

export function registerInnerApp() {
  const app: Express = express()

  app.use(bodyParser.json({
    limit: '10mb',
  }))
  app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: true,
  }))

  app.use('/inner/cron', innerApiCron)
  return app
}
