export const MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT = 50
export const MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT = 20
export const MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_MAX_LENGTH = 512
export const MESSAGE_ALERT_DIRECT_RECEIVER_CHANNEL_MAX_COUNT = 50
export const MESSAGE_ALERT_DIRECT_RECEIVER_MAX_LENGTH = 50
// 模式串中的收信人占位符：匹配时展开为正则转义后的收信人标识字面量
export const MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER = '{{receiver}}'
export const MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER = '{{rule}}'
// 标题模板中的收信人占位符：渲染时填充命中的收信人标识（与模式串占位符同写法、不同展开语义）
export const MESSAGE_ALERT_DIRECT_TITLE_RECEIVER_PLACEHOLDER = '{{receiver}}'
export const MESSAGE_ALERT_DIRECT_RECEIVER_REMARK_MAX_LENGTH = 200
export const MESSAGE_ALERT_DIRECT_RECEIVER_IMPORT_MAX_COUNT = 1000
export const MESSAGE_ALERT_DIRECT_RECEIVER_DELETE_MAX_COUNT = 1000
export const MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH = 256
export const MESSAGE_ALERT_DIRECT_TITLE_MODES = ['original', 'template', 'none'] as const

export type MessageAlertDirectTitleMode = typeof MESSAGE_ALERT_DIRECT_TITLE_MODES[number]

export interface MessageAlertDirectRulePayloadInput {
  name?: string
  titleMode?: unknown
  titleTemplate?: unknown
  contentReplace?: unknown
  titleReplace?: unknown
  alertRuleIds?: number[]
}

export interface CleanedMessageAlertDirectReceiver {
  receiver: string
  pattern: string
  remark: string
  enabled: 0 | 1
  channelIds: number[]
}

export interface CleanedMessageAlertDirectRulePayload {
  name: string
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
  contentReplace: string
  titleReplace: string
  alertRuleIds: number[]
}
