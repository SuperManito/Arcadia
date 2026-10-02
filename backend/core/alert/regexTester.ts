import { Worker } from 'node:worker_threads'
import { logger } from '../../utils/logger'

const REGEX_TIMEOUT_MS = 500

const WORKER_SOURCE = `
const { parentPort } = require('node:worker_threads')
parentPort.on('message', ({ id, pattern, input }) => {
  let hit = false
  try {
    hit = new RegExp(pattern).test(input)
  }
  catch {}
  parentPort.postMessage({ id, hit })
})
`

interface RegexJob {
  pattern: string
  input: string
  resolve: (hit: boolean | null) => void
}

// 同一时刻只允许一个任务在 worker 中执行，其余排队；
// 超时 terminate 后必须换新 worker，否则残留的死循环任务会吞掉后续所有消息
let worker: Worker | null = null
let nextId = 1
const queue: RegexJob[] = []
let current: {
  id: number
  job: RegexJob
  timer: NodeJS.Timeout
  worker: Worker
} | null = null

// 结算当前任务并派发下一个排队任务；null 表示超时或 worker 故障，调用方按不命中处理
function settle(result: boolean | null) {
  if (!current)
    return
  clearTimeout(current.timer)
  const { job } = current
  current = null
  job.resolve(result)
  pump()
}

function pump() {
  if (current)
    return
  const job = queue.shift()
  if (!job)
    return
  const target = worker ??= spawnWorker()
  if (!target) {
    // 创建失败通常持续存在，清空队列避免请求无限堆积
    job.resolve(null)
    while (queue.length > 0) {
      queue.shift()!.resolve(null)
    }
    return
  }
  const id = nextId++
  const timer = setTimeout(() => {
    logger.error('[告警引擎] 正则执行超时，按不命中处理', { pattern: job.pattern })
    worker = null
    void target.terminate()
    settle(null)
  }, REGEX_TIMEOUT_MS)
  current = { id, job, timer, worker: target }
  target.postMessage({ id, pattern: job.pattern, input: job.input })
}

function spawnWorker(): Worker | null {
  try {
    const instance = new Worker(WORKER_SOURCE, { eval: true })
    instance.unref()
    instance.on('message', ({ id, hit }) => {
      if (current?.id !== id)
        return
      settle(hit)
    })
    instance.on('error', (error: Error) => {
      logger.error('[告警引擎] 正则测试 worker 异常，按不命中处理', { error: error.message })
    })
    // error 后必跟 exit，由 exit 统一结算；若卡死则有超时兜底
    instance.on('exit', () => {
      if (worker === instance)
        worker = null
      if (current?.worker === instance) {
        settle(null)
      }
    })
    return instance
  }
  catch (e: any) {
    logger.error('[告警引擎] 正则测试 worker 创建失败，按不命中处理', { error: e?.message })
    return null
  }
}

/**
 * 在独立线程执行正则匹配：灾难性回溯只会拖垮 worker，不会阻塞主线程。
 * 返回 true/false 表示匹配结果；null 表示超时或 worker 故障，由调用方决定语义（不能参与 NOT_REGEX 取反）。
 */
export function testRegex(pattern: string, input: string): Promise<boolean | null> {
  return new Promise((resolve) => {
    queue.push({ pattern, input, resolve })
    pump()
  })
}
