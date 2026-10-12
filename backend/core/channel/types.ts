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
  /**
   * 渠道类型标识
   */
  type: string
  /**
   * 无独立标题字段的渠道：无自定义模板时整条消息合并为单段文本推送
   */
  singleBody?: boolean
  /**
   * 配置规则，用于校验渠道配置的合法性
   */
  configRules: ReadonlyArray<ValidateObjectParamType>
  /**
   * 保存期校验：规则表达不了的跨字段约束（如互备字段至少填一项），在配置清洗后调用
   */
  validateConfig?: (config: Record<string, any>) => void
  /**
   * 推送函数
   */
  pusher: (config: C, payload: PushPayload) => Promise<void>
}

export interface PushPayload {
  title: string
  content: string
}

export type Pusher = (config: Record<string, any>, payload: PushPayload) => Promise<void>
