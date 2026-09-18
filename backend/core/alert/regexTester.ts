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

interface PendingRequest {
  resolve: (hit: boolean) => void
  timer: NodeJS.Timeout
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingRequest>()

function failAll() {
  for (const [, request] of pending) {
    clearTimeout(request.timer)
    request.resolve(false)
  }
  pending.clear()
}

function spawnWorker(): Worker {
  const instance = new Worker(WORKER_SOURCE, { eval: true })
  instance.on('message', ({ id, hit }) => {
    const request = pending.get(id)
    if (!request)
      return
    clearTimeout(request.timer)
    pending.delete(id)
    request.resolve(hit)
  })
  instance.on('error', (error: Error) => {
    logger.error('[告警引擎] 正则测试 worker 异常', { error: error.message })
    failAll()
  })
  instance.on('exit', () => {
    if (worker === instance)
      worker = null
    failAll()
  })
  return instance
}

/**
 * 在独立线程执行正则匹配：灾难性回溯只会拖垮 worker，超时即 terminate 并按不命中返回
 */
export function testRegex(pattern: string, input: string): Promise<boolean> {
  return new Promise((resolve) => {
    const target = worker ??= spawnWorker()
    const id = nextId++
    const timer = setTimeout(() => {
      logger.error('[告警引擎] 正则执行超时，按不命中处理', { pattern })
      void target.terminate()
      if (worker === target)
        worker = null
    }, REGEX_TIMEOUT_MS)
    pending.set(id, { resolve, timer })
    target.postMessage({ id, pattern, input })
  })
}
