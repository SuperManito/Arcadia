import type { ChannelType, Pusher, PushPayload } from './types'
import { CHANNEL_CONFIG_RULES } from './types'
import { validateObject } from '../../utils'
import pushBark from './bark'
import pushWxpusher, { cleanConfig as cleanWxpusherConfig } from './wxpusher'

export * from './types'

export class PushError extends Error {
  constructor(public readonly channelType: string, message: string) {
    super(message)
    this.name = 'PushError'
  }
}

type ConfigCleaner = (config: Record<string, unknown>) => Record<string, unknown>

const registry = new Map<string, { pusher: Pusher, cleaner?: ConfigCleaner }>()

export function registerPusher(type: string, pusher: Pusher, cleaner?: ConfigCleaner) {
  registry.set(type, { pusher, cleaner })
}

// 渠道配置保存清洗：字段校验 + 白名单过滤 + 字符串/数组归一 + 推送器专属取值校验
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
  const cleaner = registry.get(type)?.cleaner
  if (!cleaner) {
    return result
  }
  try {
    return cleaner(result)
  }
  catch (e: any) {
    throw new Error(`渠道配置无效：${e?.message ?? '未知错误'}`)
  }
}

export async function dispatch(channel: { type: string, config: string }, payload: PushPayload) {
  const entry = registry.get(channel.type)
  const rules = CHANNEL_CONFIG_RULES[channel.type as ChannelType]
  if (!entry || !rules) {
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
    await entry.pusher(config as Record<string, any>, payload)
  }
  catch (e: any) {
    if (e instanceof PushError) {
      throw e
    }
    throw new PushError(channel.type, `推送失败：${e?.message ?? '未知错误'}`)
  }
}

// 新增渠道：① types.ts 补 config 类型与 CHANNEL_CONFIG_RULES 条目 ② 新建推送器文件（默认导出推送函数，有取值约束时导出 cleanConfig）③ 下方注册
registerPusher('wxpusher', pushWxpusher, cleanWxpusherConfig)
registerPusher('bark', pushBark)
