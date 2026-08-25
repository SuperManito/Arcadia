import { logger } from '../../utils/logger'

export const MESSAGE_CATEGORIES = ['system', 'cron', 'user'] as const
export const MESSAGE_TYPES = ['info', 'warn', 'error', 'success'] as const
export const CONDITION_FIELDS = ['title', 'content'] as const
export const RULE_LOGICS = ['and', 'or'] as const
export const SIMPLE_OPERATORS = ['include', 'not_include', 'equal', 'not_equal', 'starts_with', 'ends_with', 'empty', 'not_empty'] as const
export const REGEX_OPERATORS = ['regex', 'not_regex'] as const
export const CONDITION_MODES = ['simple', 'regex'] as const
export const VALUE_OPTIONAL_OPERATORS = ['empty', 'not_empty'] as const
export const REGEX_MAX_LENGTH = 512

export interface AlertMessageContext {
  title: string
  content: string
  category: string
  type: string
}

export interface AlertConditionInput {
  mode: string
  field: string
  operator: string
  value: string
  sort?: number
}

export interface AlertRuleInput {
  logic: string
  categories: string
  types: string
  conditions: AlertConditionInput[]
}

export interface ConditionMatchResult {
  sort: number
  matched: boolean
}

export interface RuleMatchResult {
  matched: boolean
  conditions: ConditionMatchResult[]
}

export function parseMultiValue(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => String(item ?? '').trim()).filter(Boolean))]
  }
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
}

export function assertValidRegexPattern(pattern: unknown): void {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    throw new Error('正则表达式无效')
  }
  if (pattern.length > REGEX_MAX_LENGTH) {
    throw new Error(`正则表达式长度不能超过 ${REGEX_MAX_LENGTH} 个字符`)
  }
  try {
    void new RegExp(pattern)
  }
  catch {
    throw new Error('正则表达式无效')
  }
}

// 编译失败返回 null，按不命中处理
export function tryCompileRegex(pattern: string): RegExp | null {
  try {
    assertValidRegexPattern(pattern)
    return new RegExp(pattern)
  }
  catch {
    return null
  }
}

// categories / types 为空表示不限制
export function matchFilters(msg: AlertMessageContext, rule: AlertRuleInput): boolean {
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

export function matchCondition(msg: AlertMessageContext, condition: AlertConditionInput): boolean {
  const fieldValue = condition.field === 'content' ? (msg.content ?? '') : (msg.title ?? '')
  if (condition.mode === 'regex') {
    const reg = tryCompileRegex(condition.value)
    if (!reg) {
      logger.warn('[监控告警] 条件正则编译失败，按不命中处理', { pattern: condition.value })
      return false
    }
    try {
      const hit = reg.test(fieldValue)
      return condition.operator === 'not_regex' ? !hit : hit
    }
    catch (e: any) {
      logger.warn('[监控告警] 条件正则执行异常，按不命中处理', { pattern: condition.value, error: e?.message ?? e })
      return false
    }
  }
  switch (condition.operator) {
    case 'include':
      return fieldValue.includes(condition.value)
    case 'not_include':
      return !fieldValue.includes(condition.value)
    case 'equal':
      return fieldValue === condition.value
    case 'not_equal':
      return fieldValue !== condition.value
    case 'starts_with':
      return fieldValue.startsWith(condition.value)
    case 'ends_with':
      return fieldValue.endsWith(condition.value)
    case 'empty':
      return fieldValue === ''
    case 'not_empty':
      return fieldValue !== ''
    default:
      return false
  }
}

// 返回逐条条件结果，供测试接口展示命中明细
export function evaluateRule(msg: AlertMessageContext, rule: AlertRuleInput): RuleMatchResult {
  const conditions: ConditionMatchResult[] = rule.conditions
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((condition, index) => ({
      sort: condition.sort ?? index,
      matched: matchCondition(msg, condition),
    }))
  const passed = matchFilters(msg, rule)
  const hits = conditions.map(item => item.matched)
  const conditionMatched = rule.logic === 'or' ? hits.some(Boolean) : hits.every(Boolean)
  return {
    matched: passed && conditionMatched,
    conditions,
  }
}

export function matchRule(msg: AlertMessageContext, rule: AlertRuleInput): boolean {
  return evaluateRule(msg, rule).matched
}
