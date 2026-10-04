import type { ConditionInput, SimpleOperator } from '../../alert/matcher'
import type {
  CleanedMessageAlertRuleCore,
  CleanedMessageAlertRulePayload,
  MessageAlertRuleCoreInput,
  MessageAlertRulePayloadInput,
} from './types'
import db from '../../../db'
import {
  assertValidRegexPattern,
  CONDITION_MODES,
  ConditionMode,
  parseMultiValue,
  REGEX_OPERATORS,
  RULE_LOGICS,
  RuleLogic,
  SIMPLE_OPERATORS,
  VALUE_OPTIONAL_OPERATORS,
} from '../../alert/matcher'
import { MESSAGE_CATEGORIES, MESSAGE_TYPES } from '../../type/message'
import {
  MESSAGE_ALERT_CONDITION_FIELDS,
  MESSAGE_ALERT_CONDITION_MAX_COUNT,
  MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH,
  MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT,
  MESSAGE_ALERT_RULE_DIRECT_MAX_COUNT,
  MESSAGE_ALERT_RULE_NAME_MAX_LENGTH,
} from './types'

/**
 * 多值字段校验归一：逐项必须落在允许集合内，空值放行为空串（不限制）
 */
function normalizeMultiValue(value: unknown, allowed: readonly string[], errorMessage: string): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const items = parseMultiValue(value as string | string[])
  for (const item of items) {
    if (!allowed.includes(item)) {
      throw new Error(errorMessage)
    }
  }
  return items.join(',')
}

// 保存与测试共用，不查库；allowEmptyConditions 仅限挂载一对一规则的场景（零条件 = 范围内全部命中）
export function validateMessageAlertRuleCore(
  body: MessageAlertRuleCoreInput,
  options?: { allowEmptyConditions?: boolean },
): CleanedMessageAlertRuleCore {
  const logic = body.logic ?? RuleLogic.AND
  if (!RULE_LOGICS.includes(logic as RuleLogic)) {
    throw new Error('条件组合逻辑无效')
  }

  const categories = normalizeMultiValue(body.categories, MESSAGE_CATEGORIES, '规则消息分类无效')
  const types = normalizeMultiValue(body.types, MESSAGE_TYPES, '规则消息级别无效')
  if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
    if (!options?.allowEmptyConditions) {
      throw new Error('至少需要一条匹配条件')
    }
    // 零条件时逻辑符无意义，强制 and 保证语义稳定
    return { logic: RuleLogic.AND, categories, types, conditions: [] }
  }
  if (body.conditions.length > MESSAGE_ALERT_CONDITION_MAX_COUNT) {
    throw new Error(`匹配条件数量不能超过 ${MESSAGE_ALERT_CONDITION_MAX_COUNT} 条`)
  }
  const conditions: ConditionInput[] = body.conditions.map((raw, index) => {
    const n = index + 1
    const condition = raw ?? {}
    const mode = condition.mode
    if (!CONDITION_MODES.includes(mode as ConditionMode)) {
      throw new Error(`条件 ${n} 的匹配模式无效`)
    }
    const field = condition.field
    if (!MESSAGE_ALERT_CONDITION_FIELDS.includes(field as typeof MESSAGE_ALERT_CONDITION_FIELDS[number])) {
      throw new Error(`条件 ${n} 的匹配字段无效`)
    }
    const operator = condition.operator
    const allowedOperators: readonly string[] = mode === ConditionMode.REGEX ? REGEX_OPERATORS : SIMPLE_OPERATORS
    if (!allowedOperators.includes(operator as string)) {
      throw new Error(`条件 ${n} 的匹配运算符无效`)
    }
    let value = typeof condition.value === 'string' ? condition.value : ''
    if (mode === ConditionMode.REGEX) {
      // 正则首尾空白可能有语义，保持原值；非空与长度由 assertValidRegexPattern 校验
      if (!value) {
        throw new Error(`条件 ${n} 的匹配内容不能为空`)
      }
      try {
        assertValidRegexPattern(value)
      }
      catch {
        throw new Error(`条件 ${n} 的正则表达式无效`)
      }
    }
    else {
      // 消息 title/content 落库前已 trim，简易模式匹配值需同样 trim，否则 equal / starts_with 等运算符永不命中
      value = value.trim()
      if (VALUE_OPTIONAL_OPERATORS.includes(operator as SimpleOperator)) {
        value = ''
      }
      else if (!value) {
        throw new Error(`条件 ${n} 的匹配内容不能为空`)
      }
      if (value.length > MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH) {
        throw new Error(`条件 ${n} 的匹配内容长度不能超过 ${MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH} 个字符`)
      }
    }
    return {
      mode: mode as string,
      field: field as string,
      operator: operator as string,
      value,
    }
  })

  return {
    logic,
    categories,
    types,
    conditions,
  }
}

/**
 * 保存载荷校验：本地校验（名称、核心字段、渠道 ID）前置，全部通过后才查库做名称查重与渠道存在性校验
 */
export async function validateMessageAlertRulePayload(
  body: MessageAlertRulePayloadInput,
  options?: { excludeId?: number },
): Promise<CleanedMessageAlertRulePayload> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw new Error('规则名称不能为空')
  }
  if (name.length > MESSAGE_ALERT_RULE_NAME_MAX_LENGTH) {
    throw new Error(`规则名称长度不能超过 ${MESSAGE_ALERT_RULE_NAME_MAX_LENGTH} 个字符`)
  }

  const directRuleIds: number[] = []
  for (const rawId of body.directRuleIds ?? []) {
    const id = Number(rawId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('参数 directRuleIds 无效（参数值类型错误）')
    }
    if (directRuleIds.includes(id)) {
      continue
    }
    directRuleIds.push(id)
  }
  if (directRuleIds.length > MESSAGE_ALERT_RULE_DIRECT_MAX_COUNT) {
    throw new Error(`挂载一对一规则数量不能超过 ${MESSAGE_ALERT_RULE_DIRECT_MAX_COUNT} 条`)
  }

  const core = validateMessageAlertRuleCore(body, { allowEmptyConditions: directRuleIds.length > 0 })

  const channelIds: number[] = []
  for (const rawId of body.channelIds ?? []) {
    const id = Number(rawId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('参数 channelIds 无效（参数值类型错误）')
    }
    if (channelIds.includes(id)) {
      continue
    }
    channelIds.push(id)
  }

  const duplicated = await db.messageAlertRule.findFirst({
    where: {
      name,
      ...(options?.excludeId !== undefined ? { id: { not: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  if (duplicated) {
    throw new Error('规则名称已存在')
  }

  if (channelIds.length > MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT) {
    throw new Error(`关联渠道数量不能超过 ${MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT} 个`)
  }

  if (channelIds.length > 0) {
    const channels = await db.notificationChannel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true },
    })
    if (channels.length !== channelIds.length) {
      throw new Error('渠道不存在')
    }
  }

  if (directRuleIds.length > 0) {
    const directs = await db.messageAlertDirectRule.findMany({
      where: { id: { in: directRuleIds } },
      select: { id: true },
    })
    if (directs.length !== directRuleIds.length) {
      throw new Error('挂载的一对一规则不存在')
    }
  }
  if (channelIds.length === 0 && directRuleIds.length === 0) {
    throw new Error('关联渠道与一对一规则至少配置一项')
  }

  return {
    name,
    ...core,
    channelIds,
    directRuleIds,
  }
}
