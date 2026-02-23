import type { CronJob } from 'cron'

export interface TaskInstance {
  id: string
  cron: string
  callback: string | (() => void)
  job?: CronJob
}
