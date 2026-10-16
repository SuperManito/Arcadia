import type { ConditionInput } from '../../alert'

// 匹配条件允许的字段
export const MESSAGE_ALERT_CONDITION_FIELDS = ['title', 'content'] as const
// 规则名称长度上限（全局规则与一对一规则共用命名空间）
export const MESSAGE_ALERT_RULE_NAME_MAX_LENGTH = 50
// 全局规则总量上限
export const MESSAGE_ALERT_RULE_MAX_COUNT = 50
// 单条规则的条件数量上限
export const MESSAGE_ALERT_CONDITION_MAX_COUNT = 20
// 条件匹配内容长度上限
export const MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH = 512
// 单条规则可关联的通知渠道数量上限
export const MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT = 50

export interface MessageAlertContext {
  title: string
  content: string
  category: string
  type: string
}

export interface MessageAlertRuleInput {
  logic: string
  categories: string
  types: string
  conditions: ConditionInput[]
}

export interface MessageAlertRuleDefinitionInput {
  logic?: string
  categories?: string
  types?: string
  conditions?: Array<Record<string, unknown>>
}

export interface MessageAlertRulePayloadInput extends MessageAlertRuleDefinitionInput {
  name?: string
  titleMerge?: unknown
  replaces?: unknown
  channelIds?: number[]
}

export interface CleanedMessageAlertRuleDefinition {
  logic: string
  categories: string
  types: string
  conditions: ConditionInput[]
}

export interface CleanedMessageAlertRulePayload extends CleanedMessageAlertRuleDefinition {
  name: string
  titleMerge: 0 | 1
  replaces: string
  channelIds: number[]
}
