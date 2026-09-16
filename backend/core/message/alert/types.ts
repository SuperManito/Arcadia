import type { ConditionInput } from '../../alert/matcher'

export const MESSAGE_ALERT_CONDITION_FIELDS = ['title', 'content'] as const
export const MESSAGE_ALERT_RULE_NAME_MAX_LENGTH = 50

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

export interface MessageAlertRuleCoreInput {
  logic?: string
  categories?: string
  types?: string
  conditions?: Array<Record<string, unknown>>
}

export interface MessageAlertRulePayloadInput extends MessageAlertRuleCoreInput {
  name?: string
  channelIds?: number[]
}

export interface CleanedMessageAlertRuleCore {
  logic: string
  categories: string
  types: string
  conditions: ConditionInput[]
}

export interface CleanedMessageAlertRulePayload extends CleanedMessageAlertRuleCore {
  name: string
  channelIds: number[]
}
