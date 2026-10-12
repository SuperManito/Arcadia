import type { ChannelType } from './registry'
import { CHANNEL_RATE_LIMITS } from './registry'

// 未声明 rateLimit 的渠道统一走小额并发 + 每秒 10 次的默认窗口
export const DEFAULT_RATE_LIMIT = { concurrency: 3, limits: [{ count: 10, seconds: 1 }] }

interface TypeThrottle {
  /** 请求开始时刻升序数组，按最大窗口裁剪，供各窗口计数 */
  stamps: number[]
  active: number
  waiters: Array<() => void>
  timer?: ReturnType<typeof setTimeout>
}

const throttles = new Map<string, TypeThrottle>()

export interface ThrottleLimit {
  concurrency: number
  windows: Array<{ limit: number, windowMs: number }>
}

export function resolveLimit(type: string): ThrottleLimit {
  const declared = CHANNEL_RATE_LIMITS[type as ChannelType]
  return {
    concurrency: declared?.concurrency ?? DEFAULT_RATE_LIMIT.concurrency,
    windows: (declared?.limits ?? DEFAULT_RATE_LIMIT.limits)
      .map(({ count, seconds }) => ({ limit: count, windowMs: seconds * 1000 })),
  }
}

// 滑动窗口计数器：任意窗口内请求数不超限，窗口有名额时突发立即放行；等待的请求 FIFO 放行，到点由单个定时器驱动
function schedule(type: string, limit: ThrottleLimit) {
  const t = throttles.get(type)!
  if (t.active >= limit.concurrency || t.waiters.length === 0) {
    return
  }
  const now = Date.now()
  const maxWindowMs = Math.max(...limit.windows.map(window => window.windowMs))
  while (t.stamps.length > 0 && t.stamps[0] + maxWindowMs <= now) {
    t.stamps.shift()
  }
  let wait = 0
  for (const window of limit.windows) {
    const cutoff = now - window.windowMs
    let count = 0
    while (count < t.stamps.length && t.stamps[t.stamps.length - 1 - count] > cutoff) {
      count++
    }
    if (count >= window.limit) {
      // 该窗口最早占用名额的请求出窗时刻即名额释放时刻；多窗口取最晚者
      wait = Math.max(wait, t.stamps[t.stamps.length - count] + window.windowMs - now)
    }
  }
  if (wait > 0) {
    if (!t.timer) {
      t.timer = setTimeout(() => {
        t.timer = undefined
        schedule(type, limit)
      }, wait)
    }
    return
  }
  const waiter = t.waiters.shift()!
  t.active++
  t.stamps.push(now)
  waiter()
}

export function acquire(type: string, limit: ThrottleLimit) {
  return new Promise<void>((resolve) => {
    let t = throttles.get(type)
    if (!t) {
      t = { stamps: [], active: 0, waiters: [] }
      throttles.set(type, t)
    }
    t.waiters.push(resolve)
    schedule(type, limit)
  })
}

export function release(type: string, limit: ThrottleLimit) {
  const t = throttles.get(type)!
  t.active--
  schedule(type, limit)
}

// 绕过等待但仍记账：无排队者时窗口也要感知占用，否则后续任务入队时看不到已消耗的名额
export function recordThrottleStamp(type: string, limit: ThrottleLimit) {
  let t = throttles.get(type)
  if (!t) {
    t = { stamps: [], active: 0, waiters: [] }
    throttles.set(type, t)
  }
  t.stamps.push(Date.now())
  schedule(type, limit)
}

/**
 * 队列消费方据此决定并行消费循环数，实际速率仍由节流器统一约束
 */
export function getChannelTypeConcurrency(type: string): number {
  return resolveLimit(type).concurrency
}
