import type { GeneralConfig, PushPayload } from './types'
import type { ChannelType } from './registry'
import { CHANNEL_CONFIG_RULES, CHANNEL_RATE_LIMITS, CHANNEL_SINGLE_BODY, getPusher } from './registry'
import { dateToString, validateObject } from '../../utils'
import { logger } from '../../utils/logger'
import { applyTemplate } from './applyTemplate'

export type PushResult = { success: true } | { success: false, error: string }

// 未声明 rateLimit 的渠道统一走小额并发 + 每秒 10 次的默认窗口
const DEFAULT_RATE_LIMIT = { concurrency: 3, limits: [{ count: 10, seconds: 1 }] }

interface TypeThrottle {
  /** 请求开始时刻升序数组，按最大窗口裁剪，供各窗口计数 */
  stamps: number[]
  active: number
  waiters: Array<() => void>
  timer?: ReturnType<typeof setTimeout>
}

const throttles = new Map<string, TypeThrottle>()

function resolveLimit(type: string) {
  const declared = CHANNEL_RATE_LIMITS[type as ChannelType]
  return {
    concurrency: declared?.concurrency ?? DEFAULT_RATE_LIMIT.concurrency,
    windows: (declared?.limits ?? DEFAULT_RATE_LIMIT.limits)
      .map(({ count, seconds }) => ({ limit: count, windowMs: seconds * 1000 })),
  }
}

// 滑动窗口计数器：任意窗口内请求数不超限，窗口有名额时突发立即放行；等待的请求 FIFO 放行，到点由单个定时器驱动
function schedule(type: string, limit: { concurrency: number, windows: Array<{ limit: number, windowMs: number }> }) {
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

function acquire(type: string, limit: { concurrency: number, windows: Array<{ limit: number, windowMs: number }> }) {
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

function release(type: string, limit: { concurrency: number, windows: Array<{ limit: number, windowMs: number }> }) {
  const t = throttles.get(type)!
  t.active--
  schedule(type, limit)
}

/**
 * 队列消费方据此决定并行消费循环数，实际速率仍由节流器统一约束
 */
export function getChannelTypeConcurrency(type: string): number {
  return resolveLimit(type).concurrency
}

/**
 * 渠道统一推送入口
 *
 * 类型级节流排队 → 解析配置数据对象 → 校验 → 通知尾与消息模板渲染 → 调用对应推送器
 *
 * bypassThrottle 供测试发送与定时任务失败告警等低频单次调用绕过类型级 FIFO，
 * 避免窗口占满时 HTTP 请求长时间挂起
 */
export async function pushChannel(
  channel: { type: string, config: string },
  payload: PushPayload,
  options?: { bypassThrottle?: boolean },
): Promise<PushResult> {
  const pusher = getPusher(channel.type as ChannelType)
  const rules = CHANNEL_CONFIG_RULES[channel.type]
  if (!pusher || !rules) {
    return { success: false, error: `推送失败：未注册的通知渠道类型 ${channel.type}` }
  }
  const limit = resolveLimit(channel.type)
  const throttled = !options?.bypassThrottle
  if (throttled) {
    await acquire(channel.type, limit)
  }
  try {
    let config: unknown
    try {
      config = JSON.parse(channel.config)
    }
    catch {
      return { success: false, error: '推送失败：渠道配置数据对象解析失败' }
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return { success: false, error: '推送失败：渠道配置无效' }
    }
    try {
      validateObject(config as object, rules, '推送配置')

      // 通知尾支持 \n 换行与 {{time}} 推送时间，与消息模板的占位符语义一致
      const rawFooter = (config as Record<string, any>).general?.footer?.trim()
      const footer = rawFooter
        ? rawFooter.split('\\n').join('\n').replace(/\{\{time\}\}/g, () => dateToString(new Date()))
        : ''
      let finalPayload = footer
        ? { ...payload, content: payload.content ? `${payload.content}\n\n${footer}` : footer }
        : payload

      const general = (config as Record<string, any>).general as GeneralConfig | undefined
      if (general?.messageTemplate?.trim()) {
        const rendered = applyTemplate(finalPayload, general)
        if (rendered === null) {
          // 渲染为空可能是模板写法使然（如仅留空白），不算渠道失败，记日志便于排查
          logger.warn('[渠道推送] 自定义消息模板渲染结果为空，消息未推送', { channelType: channel.type })
          return { success: true }
        }
        // 模板即消息全文；标题保留供 summary/卡片标题等原始标题场景使用
        finalPayload = { ...finalPayload, content: rendered }
      }
      else if (CHANNEL_SINGLE_BODY.has(channel.type as ChannelType)) {
        finalPayload = { ...finalPayload, content: `${finalPayload.title}\n\n${finalPayload.content}` }
      }

      await pusher(config as Record<string, any>, finalPayload)
    }
    catch (e: any) {
      return { success: false, error: `推送失败：${e?.message ?? '未知错误'}` }
    }
    return { success: true }
  }
  finally {
    if (throttled) {
      release(channel.type, limit)
    }
  }
}
