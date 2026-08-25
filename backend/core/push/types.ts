import type { ValidateObjectParamType } from '../../utils'

export type Pusher = (config: Record<string, any>, payload: PushPayload) => Promise<void>

export const CHANNEL_TYPES = ['wxpusher', 'bark'] as const
export type ChannelType = typeof CHANNEL_TYPES[number]

export interface PushPayload {
  title: string
  content: string
}

export interface WxpusherConfig {
  appToken: string
  uids?: string[]
  topicIds?: Array<string | number>
  url?: string
}

export interface BarkConfig {
  deviceKey: string
  server?: string
  url?: string
}

// 各渠道 config 字段白名单，未声明字段丢弃；'object' 无法表达的值约束由推送器导出的 cleanConfig 补齐
export const CHANNEL_CONFIG_RULES: Record<ChannelType, ReadonlyArray<ValidateObjectParamType>> = {
  wxpusher: [
    ['appToken', [true, 'string']],
    ['uids', [false, 'string[]']],
    ['topicIds', [false, 'object']],
    ['url', [false, 'string']],
  ],
  bark: [
    ['deviceKey', [true, 'string']],
    ['server', [false, 'string']],
    ['url', [false, 'string']],
  ],
}
