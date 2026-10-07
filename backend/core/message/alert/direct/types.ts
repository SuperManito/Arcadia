export const MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT = 50
export const MESSAGE_ALERT_DIRECT_KEYWORD_MAX_COUNT = 20
export const MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH = 50
export const MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH = 200
export const MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH = 256
export const MESSAGE_ALERT_DIRECT_TITLE_MODES = ['default', 'custom', 'none'] as const

export type MessageAlertDirectTitleMode = typeof MESSAGE_ALERT_DIRECT_TITLE_MODES[number]

export interface MessageAlertDirectKeywordInput {
  keyword?: unknown
  channelIds?: unknown
  remark?: unknown
  enabled?: unknown
}

export interface MessageAlertDirectRulePayloadInput {
  name?: string
  titleMode?: unknown
  titleTemplate?: unknown
}

export interface CleanedMessageAlertDirectKeyword {
  keyword: string
  channelIds: number[]
  remark: string
  enabled: 0 | 1
}

export interface CleanedMessageAlertDirectRulePayload {
  name: string
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
}
