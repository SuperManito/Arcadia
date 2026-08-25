import db from '../../db'
import type { ChannelType } from '../push'
import { CHANNEL_TYPES, cleanChannelConfig } from '../push'
import type { AlertConditionInput } from './matcher'
import {
  assertValidRegexPattern,
  CONDITION_FIELDS,
  CONDITION_MODES,
  MESSAGE_CATEGORIES,
  MESSAGE_TYPES,
  parseMultiValue,
  REGEX_OPERATORS,
  RULE_LOGICS,
  SIMPLE_OPERATORS,
  VALUE_OPTIONAL_OPERATORS,
} from './matcher'

export const RULE_SCOPES = ['message'] as const
export const NAME_MAX_LENGTH = 50

export interface RuleCoreInput {
  logic?: string
  categories?: string
  types?: string
  conditions?: Array<Record<string, unknown>>
}

export interface RulePayloadInput extends RuleCoreInput {
  name?: string
  channelIds?: number[]
}

export interface ChannelPayloadInput {
  name?: string
  type?: string
  config?: string | Record<string, unknown>
}

export interface CleanedRuleCore {
  logic: string
  categories: string
  types: string
  conditions: AlertConditionInput[]
}

export interface CleanedRulePayload extends CleanedRuleCore {
  name: string
  scope: string
  channelIds: number[]
}

export interface CleanedChannelPayload {
  name: string
  type: string
  config: string
}

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
export function validateRuleCore(body: RuleCoreInput): CleanedRuleCore {
  const logic = body.logic ?? 'and'
  if (!RULE_LOGICS.includes(logic as typeof RULE_LOGICS[number])) {
    throw new Error('条件组合逻辑无效')
  }

  const categories = normalizeMultiValue(body.categories, MESSAGE_CATEGORIES, '规则消息分类无效')
  const types = normalizeMultiValue(body.types, MESSAGE_TYPES, '规则消息级别无效')
  if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
    throw new Error('至少需要一条匹配条件')
  }
  const conditions: AlertConditionInput[] = body.conditions.map((raw, index) => {
    const n = index + 1
    const condition = raw ?? {}
    const mode = condition.mode
    if (!CONDITION_MODES.includes(mode as typeof CONDITION_MODES[number])) {
      throw new Error(`条件 ${n} 的匹配模式无效`)
    }
    const field = condition.field
    if (!CONDITION_FIELDS.includes(field as typeof CONDITION_FIELDS[number])) {
      throw new Error(`条件 ${n} 的匹配字段无效`)
    }
    const operator = condition.operator
    const allowedOperators: readonly string[] = mode === 'regex' ? REGEX_OPERATORS : SIMPLE_OPERATORS
    if (!allowedOperators.includes(operator as string)) {
      throw new Error(`条件 ${n} 的匹配运算符无效`)
    }
    let value = typeof condition.value === 'string' ? condition.value : ''
    if ((VALUE_OPTIONAL_OPERATORS as readonly string[]).includes(operator as string)) {
      value = ''
    }
    else if (!value.trim()) {
      throw new Error(`条件 ${n} 的匹配内容不能为空`)
    }
    if (mode === 'regex') {
      try {
        assertValidRegexPattern(value)
      }
      catch {
        throw new Error(`条件 ${n} 的正则表达式无效`)
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

export async function validateRulePayload(
  body: RulePayloadInput,
  options?: { excludeId?: number },
): Promise<CleanedRulePayload> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw new Error('规则名称不能为空')
  }
  if (name.length > NAME_MAX_LENGTH) {
    throw new Error(`规则名称长度不能超过 ${NAME_MAX_LENGTH} 个字符`)
  }
  const duplicated = await db.alertRule.findFirst({
    where: {
      name,
      ...(options?.excludeId !== undefined ? { id: { not: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  if (duplicated) {
    throw new Error('规则名称已存在')
  }

  const core = validateRuleCore(body)

  // channelIds 顺序即触发顺序
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
  if (channelIds.length > 0) {
    const channels = await db.alertChannel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true },
    })
    if (channels.length !== channelIds.length) {
      throw new Error('渠道不存在')
    }
  }

  return {
    name,
    scope: 'message',
    ...core,
    channelIds,
  }
}

export async function validateChannelPayload(
  body: ChannelPayloadInput,
  options?: { excludeId?: number, skipNameCheck?: boolean },
): Promise<CleanedChannelPayload> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!options?.skipNameCheck) {
    if (!name) {
      throw new Error('渠道名称不能为空')
    }
    if (name.length > NAME_MAX_LENGTH) {
      throw new Error(`渠道名称长度不能超过 ${NAME_MAX_LENGTH} 个字符`)
    }
    const duplicated = await db.alertChannel.findFirst({
      where: {
        name,
        ...(options?.excludeId !== undefined ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    })
    if (duplicated) {
      throw new Error('渠道名称已存在')
    }
  }

  const type = body.type
  if (!CHANNEL_TYPES.includes(type as ChannelType)) {
    throw new Error(`不支持的渠道类型：${String(type)}`)
  }

  let config: unknown = body.config
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config)
    }
    catch {
      throw new Error('渠道配置无效：JSON 解析失败')
    }
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('渠道配置无效：必须是对象')
  }
  const cleaned = cleanChannelConfig(type as ChannelType, config as Record<string, unknown>)

  return {
    name,
    type: type as string,
    config: JSON.stringify(cleaned),
  }
}
