export const MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT = 50
export const MESSAGE_ALERT_DIRECT_CONDITION_REMARK_MAX_LENGTH = 200
export const MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH = 256
export const MESSAGE_ALERT_DIRECT_TITLE_MODES = ['default', 'custom', 'none'] as const

export type MessageAlertDirectTitleMode = typeof MESSAGE_ALERT_DIRECT_TITLE_MODES[number]

export interface MessageAlertDirectConditionInput {
  mode?: unknown
  operator?: unknown
  value?: unknown
  enabled?: unknown
  remark?: unknown
}

export interface MessageAlertDirectRuleCoreInput {
  logic?: string
  conditions?: MessageAlertDirectConditionInput[]
}

export interface MessageAlertDirectRulePayloadInput extends MessageAlertDirectRuleCoreInput {
  name?: string
  extractRegex?: unknown
  titleMode?: unknown
  titleTemplate?: unknown
  channelIds?: number[]
}

export interface CleanedMessageAlertDirectCondition {
  mode: string
  field: string
  operator: string
  value: string
  enabled: number
  remark: string
}

export interface CleanedMessageAlertDirectRuleCore {
  logic: string
  conditions: CleanedMessageAlertDirectCondition[]
}

export interface CleanedMessageAlertDirectRulePayload extends CleanedMessageAlertDirectRuleCore {
  name: string
  extractRegex: string
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
  channelIds: number[]
}

// 索引签名：入参需兼容 evaluateConditions / matchCondition 的 Record<string, string>
export interface MessageAlertDirectContext {
  title: string
  content: string
  [key: string]: string
}
