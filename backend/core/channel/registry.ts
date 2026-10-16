import type { ValidateObjectParamType } from '../../utils'
import type { ChannelDefinition, Pusher } from './types'
import { Channels } from './providers'
type Definitions = (typeof Channels)[keyof typeof Channels]

export type ChannelType = Definitions['type']

const ChannelTypeMap = Object.fromEntries(
  (Object.keys(Channels) as Array<keyof typeof Channels>).map(key => [key, Channels[key].type]),
) as { [K in keyof typeof Channels]: (typeof Channels)[K]['type'] }
export { ChannelTypeMap as ChannelType }

export const CHANNEL_CONFIG_RULES = Object.fromEntries(
  Object.values(Channels).map(def => [def.type, def.configRules]),
) as Record<ChannelType, ReadonlyArray<ValidateObjectParamType>>

export const CHANNEL_CONFIG_VALIDATORS = Object.fromEntries(
  Object.values(Channels).map(def => [def.type, (def as ChannelDefinition).validateConfig]),
) as Record<ChannelType, ((config: Record<string, any>) => void) | undefined>

export const CHANNEL_SINGLE_BODY = new Set(
  Object.values(Channels)
    .filter(def => (def as ChannelDefinition).singleBody)
    .map(def => def.type),
) as Set<ChannelType>

// 无独立标题概念的渠道：标题只存在于并入正文一种形态，"无标题渠道仅发正文"开关只作用于这些渠道
export const CHANNEL_TITLELESS = new Set(
  Object.values(Channels)
    .filter(def => (def as ChannelDefinition).singleBody && !(def as ChannelDefinition).summaryTitle)
    .map(def => def.type),
) as Set<string>

/**
 * 判断渠道类型是否为无独立标题渠道
 */
export function isTitlelessChannel(type: string) {
  return CHANNEL_TITLELESS.has(type)
}

export const CHANNEL_RATE_LIMITS = Object.fromEntries(
  Object.values(Channels)
    .filter(def => (def as ChannelDefinition).rateLimit)
    .map(def => [def.type, (def as ChannelDefinition).rateLimit!]),
) as Partial<Record<ChannelType, NonNullable<ChannelDefinition['rateLimit']>>>

const registry = new Map<ChannelType, Pusher>()
for (const def of Object.values(Channels)) {
  registry.set(def.type, def.pusher)
}

/**
 * 按渠道类型取已注册的推送器
 */
export function getPusher(type: ChannelType) {
  return registry.get(type)
}
