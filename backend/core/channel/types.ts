import type { ValidateObjectRules } from '../../utils'

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
   * singleBody 渠道的标题还会作为通知摘要/卡片标题使用（如 WxPusher summary），不视为无独立标题渠道
   */
  summaryTitle?: boolean
  /**
   * 发送凭据的接口请求频率限制：limits 内每项为"任意 seconds 秒内最多 count 次"的滑动窗口约束（可多层叠加，如 5 次/秒 + 100 次/分钟），concurrency 为同时在途请求上限；未声明走全局默认值
   */
  rateLimit?: { concurrency?: number, limits: Array<{ count: number, seconds: number }> }
  /**
   * 配置规则，用于校验渠道配置的合法性
   */
  configRules: ValidateObjectRules
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

export type PushResult = { success: true } | { success: false, error: string }

export type Pusher = (config: Record<string, any>, payload: PushPayload) => Promise<void>
