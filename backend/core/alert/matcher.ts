import { logger } from '../../utils/logger'

export const RULE_LOGICS = ['and', 'or'] as const
export const SIMPLE_OPERATORS = ['include', 'not_include', 'equal', 'not_equal', 'starts_with', 'ends_with', 'empty', 'not_empty'] as const
export const REGEX_OPERATORS = ['regex', 'not_regex'] as const
export const CONDITION_MODES = ['simple', 'regex'] as const
export const VALUE_OPTIONAL_OPERATORS = ['empty', 'not_empty'] as const
export const REGEX_MAX_LENGTH = 512

export interface ConditionInput {
  mode: string
  field: string
  operator: string
  value: string
  sort?: number
}

export interface ConditionMatchResult {
  sort: number
  matched: boolean
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

// 上下文按字段名取值，可用字段集由各业务域定义
export function matchCondition(context: Record<string, string>, condition: ConditionInput): boolean {
  const fieldValue = context[condition.field] ?? ''
  if (condition.mode === 'regex') {
    const reg = tryCompileRegex(condition.value)
    if (!reg) {
      logger.warn('[告警引擎] 条件正则编译失败，按不命中处理', { pattern: condition.value })
      return false
    }
    try {
      const hit = reg.test(fieldValue)
      return condition.operator === 'not_regex' ? !hit : hit
    }
    catch (e: any) {
      logger.warn('[告警引擎] 条件正则执行异常，按不命中处理', { pattern: condition.value, error: e?.message ?? e })
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

// matched 仅由 conditions 与 logic 决定，业务范围过滤由各业务域叠加
export function evaluateConditions(context: Record<string, string>, logic: string, conditions: ConditionInput[]): { matched: boolean, conditions: ConditionMatchResult[] } {
  const results: ConditionMatchResult[] = conditions
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((condition, index) => ({
      sort: condition.sort ?? index,
      matched: matchCondition(context, condition),
    }))
  const hits = results.map(item => item.matched)
  return {
    matched: logic === 'or' ? hits.some(Boolean) : hits.every(Boolean),
    conditions: results,
  }
}
