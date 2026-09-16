import type { messageModel } from '../../db'
import { db } from '../../db'
import { logger } from '../../utils/logger'
import type { ConditionInput } from '../alert/matcher'
import {
  assertValidRegexPattern,
  CONDITION_MODES,
  evaluateConditions,
  parseMultiValue,
  REGEX_OPERATORS,
  RULE_LOGICS,
  SIMPLE_OPERATORS,
  VALUE_OPTIONAL_OPERATORS,
} from '../alert/matcher'
import { dispatch } from '../channel'
import { sendMessage } from './index'

export const MESSAGE_CATEGORIES = ['system', 'cron', 'user'] as const
export const MESSAGE_TYPES = ['info', 'warn', 'error', 'success'] as const
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

// categories / types 为空表示不限制
function matchMessageAlertFilters(msg: MessageAlertContext, rule: MessageAlertRuleInput): boolean {
  const categories = parseMultiValue(rule.categories)
  if (categories.length > 0 && !categories.includes(msg.category)) {
    return false
  }
  const types = parseMultiValue(rule.types)
  if (types.length > 0 && !types.includes(msg.type)) {
    return false
  }
  return true
}

// 返回逐条条件结果，供测试接口展示命中明细；matched 含分类/级别范围过滤
export function evaluateMessageAlertRule(msg: MessageAlertContext, rule: MessageAlertRuleInput): { matched: boolean, conditions: Array<{ sort: number, matched: boolean }> } {
  const conditionResult = evaluateConditions({ title: msg.title, content: msg.content }, rule.logic, rule.conditions)
  return {
    matched: matchMessageAlertFilters(msg, rule) && conditionResult.matched,
    conditions: conditionResult.conditions,
  }
}

export function matchMessageAlertRule(msg: MessageAlertContext, rule: MessageAlertRuleInput): boolean {
  return evaluateMessageAlertRule(msg, rule).matched
}

export async function processMessageAlert(msg: messageModel) {
  const rules = await db.messageAlertRule.findMany({
    where: { enabled: 1 },
    include: {
      conditions: { orderBy: { sort: 'asc' } },
      channels: { orderBy: { sort: 'asc' }, include: { channel: true } },
    },
  })

  for (const rule of rules) {
    const hit = matchMessageAlertRule(
      { title: msg.title, content: msg.content, category: msg.category, type: msg.type },
      {
        logic: rule.logic,
        categories: rule.categories,
        types: rule.types,
        conditions: rule.conditions.map(condition => ({
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          sort: condition.sort,
        })),
      },
    )
    if (!hit) {
      continue
    }
    for (const link of rule.channels) {
      try {
        await dispatch(
          { type: link.channel.type, config: link.channel.config },
          { title: msg.title, content: msg.content },
        )
      }
      catch (e: any) {
        logger.error('[消息中心监控告警] 渠道发送失败', {
          ruleId: rule.id,
          ruleName: rule.name,
          channelId: link.channel.id,
          channelName: link.channel.name,
          channelType: link.channel.type,
          error: e?.message ?? e,
        })
        void sendMessage({
          title: '告警消息推送失败',
          content: `规则：${rule.name}\n渠道：${link.channel.name}（${link.channel.type}）\n错误：${e?.message ?? '未知错误'}`,
          category: 'system',
          type: 'error',
          skipAlert: true,
        }).catch(() => {})
      }
    }
  }
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
export function validateMessageAlertRuleCore(body: MessageAlertRuleCoreInput): CleanedMessageAlertRuleCore {
  const logic = body.logic ?? 'and'
  if (!RULE_LOGICS.includes(logic as typeof RULE_LOGICS[number])) {
    throw new Error('条件组合逻辑无效')
  }

  const categories = normalizeMultiValue(body.categories, MESSAGE_CATEGORIES, '规则消息分类无效')
  const types = normalizeMultiValue(body.types, MESSAGE_TYPES, '规则消息级别无效')
  if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
    throw new Error('至少需要一条匹配条件')
  }
  const conditions: ConditionInput[] = body.conditions.map((raw, index) => {
    const n = index + 1
    const condition = raw ?? {}
    const mode = condition.mode
    if (!CONDITION_MODES.includes(mode as typeof CONDITION_MODES[number])) {
      throw new Error(`条件 ${n} 的匹配模式无效`)
    }
    const field = condition.field
    if (!MESSAGE_ALERT_CONDITION_FIELDS.includes(field as typeof MESSAGE_ALERT_CONDITION_FIELDS[number])) {
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

  const core = validateMessageAlertRuleCore(body)

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
    const channels = await db.notifyChannel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true },
    })
    if (channels.length !== channelIds.length) {
      throw new Error('渠道不存在')
    }
  }

  return {
    name,
    ...core,
    channelIds,
  }
}
