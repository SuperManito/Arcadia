import type { GeneralConfig, PushPayload, PushResult } from './types'
import type { ChannelType } from './registry'
import { CHANNEL_CONFIG_RULES, CHANNEL_SINGLE_BODY, getPusher } from './registry'
import { acquire, recordThrottleStamp, release, resolveLimit } from './throttle'
import { dateToString, validateObject } from '../../utils'
import { logger } from '../../utils/logger'
import { TEMPLATE_TIME_PLACEHOLDER } from './constants'
import { applyTemplate } from './applyTemplate'

const TRIM_PATTERN = /^(?:\s|<br\s*\/?>)+|(?:\s|<br\s*\/?>)+$/gi

/**
 * 去除首尾换行符与空白字符
 */
function trim(value: string): string {
  return value.replace(TRIM_PATTERN, '')
}

// 推送器无自带超时契约，网络挂起会无限占用节流窗口与队列在途名额
const PUSH_TIMEOUT_MS = 60000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('推送超时')), PUSH_TIMEOUT_MS)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * 渠道统一推送入口
 *
 * 解析配置数据对象 → 校验 → 类型级节流排队 → 通知尾与消息模板渲染 → 调用对应推送器
 *
 * bypassThrottle 供低频调用绕过类型级 FIFO：true 完全绕过、不占窗口名额（/channel/test 手动单次）；
 * 'record' 记名额不等待，时间戳写入滑动窗口供后续排队任务感知，定时任务失败告警用，避免批量故障击穿提供方限流
 */
export async function pushChannel(
  channel: { name?: string, type: string, config: string },
  payload: PushPayload,
  options?: { bypassThrottle?: boolean | 'record' },
): Promise<PushResult> {
  const pusher = getPusher(channel.type as ChannelType)
  const rules = CHANNEL_CONFIG_RULES[channel.type]
  if (!pusher || !rules) {
    return { success: false, error: `推送失败：未注册的通知渠道类型 ${channel.type}` }
  }
  // 解析与校验不进节流窗口：配置错误的渠道反复失败时不会挤占正常渠道的排队名额
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
  }
  catch (e: any) {
    return { success: false, error: `推送失败：${e?.message ?? '未知错误'}` }
  }

  const limit = resolveLimit(channel.type)
  const bypass = options?.bypassThrottle
  const throttled = !bypass
  if (throttled) {
    await acquire(channel.type, limit)
  }
  else if (bypass === 'record') {
    recordThrottleStamp(channel.type, limit)
  }
  try {
    // 通知尾支持 \n 换行与 {{time}} 推送时间，与消息模板的占位符语义一致
    const rawFooter = (config as Record<string, any>).general?.footer?.trim()
    const footer = rawFooter
      ? rawFooter.split('\\n').join('\n').split(TEMPLATE_TIME_PLACEHOLDER).join(dateToString(new Date()))
      : ''
    let finalPayload = footer
      ? {
          ...payload,
          content: payload.content
            ? `${payload.content}\n\n${footer}`
            : footer,
        }
      : payload

    const general = (config as Record<string, any>).general as GeneralConfig | undefined
    if (general?.messageTemplate?.trim()) {
      const rendered = applyTemplate(finalPayload, general)
      if (rendered === null) {
        // 渲染为空可能是模板写法使然（如仅留空白），不算渠道失败，记日志便于排查
        logger.warn('[渠道推送] 自定义消息模板渲染结果为空，消息未推送', JSON.stringify({ channel: channel.name, channelType: channel.type }))
        return { success: true }
      }
      // 模板即消息全文；标题保留供 summary/卡片标题等原始标题场景使用
      finalPayload = { ...finalPayload, content: rendered }
    }
    else if (CHANNEL_SINGLE_BODY.has(channel.type as ChannelType)) {
      finalPayload = { ...finalPayload, content: `${finalPayload.title}\n\n${finalPayload.content}` }
    }

    finalPayload = {
      ...finalPayload,
      title: trim(finalPayload.title),
      content: trim(finalPayload.content),
    }

    await withTimeout(pusher(config as Record<string, any>, finalPayload))
    return { success: true }
  }
  catch (e: any) {
    return { success: false, error: `推送失败：${e?.message ?? '未知错误'}` }
  }
  finally {
    if (throttled) {
      release(channel.type, limit)
    }
  }
}
