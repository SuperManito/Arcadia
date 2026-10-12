export const MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT = 50
export const MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT = 20
export const MESSAGE_ALERT_DIRECT_KEYWORD_MAX_COUNT = 20
export const MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH = 512
export const MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_MAX_LENGTH = 50
// 模式串中的收信人占位符：匹配时展开为转义后的收信人标识字面量
export const MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER = '{{receiver}}'
export const MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH = 200
export const MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH = 256
export const MESSAGE_ALERT_DIRECT_TITLE_MODES = ['default', 'custom', 'none'] as const

export type MessageAlertDirectTitleMode = typeof MESSAGE_ALERT_DIRECT_TITLE_MODES[number]

export interface MessageAlertDirectKeywordInput {
  keyword?: unknown
  channelIds?: unknown
  receiver?: unknown
  remark?: unknown
  enabled?: unknown
}

export interface MessageAlertDirectRulePayloadInput {
  name?: string
  titleMode?: unknown
  titleTemplate?: unknown
  contentReplace?: unknown
  titleReplace?: unknown
  ruleIds?: number[]
}

export interface CleanedMessageAlertDirectKeyword {
  keyword: string
  channelIds: number[]
  receiver: string
  remark: string
  enabled: 0 | 1
}

export interface CleanedMessageAlertDirectRulePayload {
  name: string
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
  contentReplace: string
  titleReplace: string
  ruleIds: number[]
}
