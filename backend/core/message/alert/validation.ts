import type { ConditionInput, SimpleOperator } from '../../alert'
import type {
  CleanedMessageAlertRuleDefinition,
  CleanedMessageAlertRulePayload,
  MessageAlertRuleDefinitionInput,
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
  stringifyReplacePairs,
  validateReplacePairs,
  VALUE_OPTIONAL_OPERATORS,
} from '../../alert'
import { MESSAGE_CATEGORIES, MESSAGE_TYPES } from '../../type/message'
import {
  MESSAGE_ALERT_CONDITION_FIELDS,
  MESSAGE_ALERT_CONDITION_MAX_COUNT,
  MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH,
  MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT,
  MESSAGE_ALERT_RULE_MAX_COUNT,
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

// 保存与测试共用，不查库
export function validateMessageAlertRuleDefinition(
  body: MessageAlertRuleDefinitionInput,
): CleanedMessageAlertRuleDefinition {
  const logic = body.logic ?? RuleLogic.AND
  if (!RULE_LOGICS.includes(logic as RuleLogic)) {
    throw new Error('条件组合逻辑无效')
  }

  const categories = normalizeMultiValue(body.categories, MESSAGE_CATEGORIES, '规则消息分类无效')
  const types = normalizeMultiValue(body.types, MESSAGE_TYPES, '规则消息级别无效')
  if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
    throw new Error('至少需要一条匹配条件')
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
 * 保存载荷校验：本地校验（名称、逻辑/范围/条件、渠道 ID）前置，全部通过后才查库做名称查重与渠道存在性校验
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

  const core = validateMessageAlertRuleDefinition(body)
  const titleMerge = body.titleMerge ?? 1
  if (titleMerge !== 0 && titleMerge !== 1) {
    throw new Error('参数 titleMerge 无效（参数值类型错误）')
  }
  const replaces = stringifyReplacePairs(validateReplacePairs(body.replaces))

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

  // 共用命名空间：告警规则与一对一规则名都不可重名
  const [duplicated, directDuplicated] = await Promise.all([
    db.messageAlertRule.findFirst({
      where: {
        name,
        ...(options?.excludeId !== undefined ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    }),
    db.messageAlertDirectRule.findFirst({ where: { name }, select: { id: true } }),
  ])
  if (duplicated || directDuplicated) {
    throw new Error('规则名称已存在')
  }

  if (channelIds.length > MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT) {
    throw new Error(`关联渠道数量不能超过 ${MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT} 个`)
  }

  // 仅新建时校验总数；规则全量参与求值，数量需要收敛
  if (options?.excludeId === undefined) {
    const count = await db.messageAlertRule.count()
    if (count >= MESSAGE_ALERT_RULE_MAX_COUNT) {
      throw new Error(`规则数量不能超过 ${MESSAGE_ALERT_RULE_MAX_COUNT} 条`)
    }
  }

  if (channelIds.length > 0) {
    const channels = await db.notificationChannel.$list(
      { where: { id: { in: channelIds } } },
      { select: { id: true } },
    )
    if (channels.length !== channelIds.length) {
      throw new Error('渠道不存在')
    }
  }

  return {
    name,
    ...core,
    titleMerge,
    replaces,
    channelIds,
  }
}
