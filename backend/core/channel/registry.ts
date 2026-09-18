import type { ValidateObjectParamType } from '../../utils'
import type { ChannelDefinition, Pusher } from './types'
import { Channels } from './providers'

type Definitions = (typeof Channels)[keyof typeof Channels]
type ConfigOf<D> = D extends ChannelDefinition<infer C> ? C : never

export type ChannelType = Definitions['type']
export type ChannelConfig = ConfigOf<Definitions>

const ChannelTypeMap = Object.fromEntries(
  (Object.keys(Channels) as Array<keyof typeof Channels>).map(key => [key, Channels[key].type]),
) as { [K in keyof typeof Channels]: (typeof Channels)[K]['type'] }
export { ChannelTypeMap as ChannelType }

export const CHANNEL_CONFIG_RULES = Object.fromEntries(
  Object.values(Channels).map(def => [def.type, def.configRules]),
) as Record<ChannelType, ReadonlyArray<ValidateObjectParamType>>

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
