import type { PushPayload } from './types'
import { CHANNEL_CONFIG_RULES, getPusher } from './registry'
import type { ChannelType } from './registry'
import { validateObject } from '../../utils'

export type PushResult = { success: true } | { success: false, error: string }

/**
 * 渠道统一推送入口
 *
 * 解析配置数据对象 → 校验 → 调用对应推送器
 */
export async function pushChannel(
  channel: { type: string, config: string },
  payload: PushPayload,
): Promise<PushResult> {
  const pusher = getPusher(channel.type as ChannelType)
  const rules = CHANNEL_CONFIG_RULES[channel.type]
  if (!pusher || !rules) {
    return { success: false, error: `推送失败：未注册的通知渠道类型 ${channel.type}` }
  }
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

    // 追加通知尾部内容
    const footer = (config as Record<string, any>).general?.footer?.trim()
    const finalPayload = footer
      ? { ...payload, content: payload.content ? `${payload.content}\n\n${footer}` : footer }
      : payload

    await pusher(config as Record<string, any>, finalPayload)
  }
  catch (e: any) {
    return { success: false, error: `推送失败：${e?.message ?? '未知错误'}` }
  }
  return { success: true }
}
