import type { ConditionInput } from '../../alert'

export const MESSAGE_ALERT_CONDITION_FIELDS = ['title', 'content'] as const
export const MESSAGE_ALERT_RULE_NAME_MAX_LENGTH = 50
export const MESSAGE_ALERT_RULE_MAX_COUNT = 50
export const MESSAGE_ALERT_CONDITION_MAX_COUNT = 20
export const MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH = 512
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
  contentReplace?: unknown
  titleReplace?: unknown
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
  contentReplace: string
  titleReplace: string
  channelIds: number[]
}
