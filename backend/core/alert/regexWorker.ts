import { Worker } from 'node:worker_threads'
import { logger } from '../../utils/logger'

const REGEX_TIMEOUT_MS = 500
// 积压上限：超限直接按失败结算，防止慢任务持续堆积拖垮内存与响应
const QUEUE_MAX_SIZE = 200

const WORKER_SOURCE = `
const { parentPort } = require('node:worker_threads')
parentPort.on('message', ({ id, pattern, input, replacement, match }) => {
  let result = false
  try {
    if (match) {
      const regex = new RegExp(pattern)
      result = input.map(line => {
        const m = regex.exec(line)
        return m ? m[0] : null
      })
    }
    else if (replacement !== undefined) {
      result = Array.isArray(input)
        ? input.map(line => line.replace(new RegExp(pattern, 'g'), replacement))
        : input.replace(new RegExp(pattern, 'g'), replacement)
    }
    else {
      result = new RegExp(pattern).test(input)
    }
  }
  catch {}
  parentPort.postMessage({ id, result })
})
`

interface RegexJob {
  pattern: string
  input: string | string[]
  replacement?: string
  match?: boolean
  resolve: (result: boolean | string | string[] | Array<string | null> | null) => void
}

// eval 脚本无法被 TS 检查，消息字段以 WorkerRequest 为准；增减字段时同步 worker 源码里的解构
interface WorkerRequest {
  id: number
  pattern: string
  input: string | string[]
  replacement?: string
  match?: boolean
}

function buildRequest(id: number, job: RegexJob): WorkerRequest {
  return { id, pattern: job.pattern, input: job.input, replacement: job.replacement, match: job.match }
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

// 结算当前任务并派发下一个排队任务
function settle(result: boolean | string | string[] | Array<string | null> | null) {
  if (!current)
    return
  clearTimeout(current.timer)
  const { job } = current
  current = null
  job.resolve(result)
  pump()
}

function enqueue(job: RegexJob) {
  if (queue.length >= QUEUE_MAX_SIZE) {
    logger.warn('[告警引擎] 正则任务队列已满，按不命中处理', { pattern: job.pattern })
    job.resolve(null)
    return
  }
  queue.push(job)
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
  target.postMessage(buildRequest(id, job))
}

function spawnWorker(): Worker | null {
  try {
    const instance = new Worker(WORKER_SOURCE, { eval: true })
    instance.unref()
    instance.on('message', ({ id, result }) => {
      if (current?.id !== id)
        return
      settle(result)
    })
    instance.on('error', (error: Error) => {
      logger.error('[告警引擎] 正则 worker 异常，按不命中处理', { error: error.message })
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
    logger.error('[告警引擎] 正则 worker 创建失败，按不命中处理', { error: e?.message })
    return null
  }
}

/**
 * 在独立线程执行正则匹配：灾难性回溯只会拖垮 worker，不会阻塞主线程。
 * 返回 true/false 表示匹配结果；null 表示超时或 worker 故障，由调用方决定语义（不能参与 NOT_REGEX 取反）。
 */
export function matchRegex(pattern: string, input: string): Promise<boolean | null> {
  return new Promise((resolve) => {
    enqueue({ pattern, input, resolve: result => resolve(typeof result === 'boolean' ? result : null) })
  })
}

/**
 * 全量替换（隐含 g 标志）：返回替换后的字符串。
 * 返回 null 表示超时、正则编译失败或 worker 故障，调用方决定语义（按跳过处理）。
 */
export function replaceRegex(pattern: string, replacement: string, input: string): Promise<string | null> {
  return new Promise((resolve) => {
    enqueue({ pattern, input, replacement, resolve: result => resolve(typeof result === 'string' ? result : null) })
  })
}

/**
 * 批量行匹配：逐行独立 exec（非全局，无 lastIndex 状态），返回每行命中的文本片段（未命中为 null）。
 * 返回 null 表示超时、正则编译失败或 worker 故障，调用方决定语义（按不命中处理）。
 */
export function matchRegexLines(pattern: string, inputs: string[]): Promise<Array<string | null> | null> {
  return new Promise((resolve) => {
    enqueue({
      pattern,
      input: inputs,
      match: true,
      resolve: result => resolve(Array.isArray(result) ? result as Array<string | null> : null),
    })
  })
}
