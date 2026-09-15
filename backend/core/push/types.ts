import type { ValidateObjectParamType } from '../../utils'

/**
 * 随各渠道 config 一同存储
 */
export interface GeneralConfig {
  footer?: string
  messageTemplate?: string
  proxy?: string
}

/**
 * 渠道配置基类
 */
export interface BaseChannelConfig {
  general?: GeneralConfig
}

/**
 * 渠道定义
 */
export interface ChannelDefinition<C extends BaseChannelConfig = BaseChannelConfig> {
  type: string
  configRules: ReadonlyArray<ValidateObjectParamType>
  pusher: (config: C, payload: PushPayload) => Promise<void>
}

export interface PushPayload {
  title: string
  content: string
}

export type Pusher = (config: Record<string, any>, payload: PushPayload) => Promise<void>
