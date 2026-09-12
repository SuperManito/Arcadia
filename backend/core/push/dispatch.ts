import type { ChannelType, PushPayload } from './types'
import { CHANNEL_CONFIG_RULES } from './types'
import { validateObject } from '../../utils'
import { getPusher } from './registry'

/**
 * 推送失败错误，携带出错的渠道类型
 */
export class PushError extends Error {
  constructor(public readonly channelType: string, message: string) {
    super(message)
    this.name = 'PushError'
  }
}

/**
 * 渠道配置保存清洗：字段类型校验 + 白名单过滤 + 字符串 / 数组归一
 *
 * @param type 渠道类型唯一键
 * @param raw 前端提交的原始配置
 * @returns 仅含白名单字段、已归一的配置
 */
export function cleanChannelConfig(type: ChannelType, raw: Record<string, unknown>): Record<string, unknown> {
  const rules = CHANNEL_CONFIG_RULES[type]
  try {
    validateObject(raw, rules)
  }
  catch (e: any) {
    throw new Error(`渠道配置无效：${e?.message ?? '字段类型错误'}`)
  }
  const result: Record<string, unknown> = {}
  for (const [key, options] of rules) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      continue
    }
    const value = raw[key]
    if (options?.[1]?.[1] === 'string') {
      const text = (value as string).trim()
      if (options[0] && !text) {
        throw new Error(`渠道配置无效：${key} 不能为空`)
      }
      result[key] = text
    }
    else if (Array.isArray(value)) {
      result[key] = [...new Set(value.map(item => (typeof item === 'string' ? item.trim() : item)).filter(item => item !== ''))]
    }
    else {
      result[key] = value
    }
  }
  return result
}

/**
 * 派发消息到指定渠道：解析配置 JSON → 校验 → 调用推送器
 *
 * @param channel 渠道记录，含类型唯一键与 JSON 字符串配置
 * @param payload 推送载荷，标题 + 正文
 */
export async function dispatch(channel: { type: string, config: string }, payload: PushPayload) {
  const pusher = getPusher(channel.type)
  const rules = CHANNEL_CONFIG_RULES[channel.type as ChannelType]
  if (!pusher || !rules) {
    throw new PushError(channel.type, `推送失败：未注册的通知渠道类型 ${channel.type}`)
  }
  let config: unknown
  try {
    config = JSON.parse(channel.config)
  }
  catch {
    throw new PushError(channel.type, '推送失败：渠道配置 JSON 解析失败')
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new PushError(channel.type, '推送失败：渠道配置无效')
  }
  try {
    validateObject(config as object, rules, '推送配置')
    await pusher(config as Record<string, any>, payload)
  }
  catch (e: any) {
    if (e instanceof PushError) {
      throw e
    }
    throw new PushError(channel.type, `推送失败：${e?.message ?? '未知错误'}`)
  }
}
