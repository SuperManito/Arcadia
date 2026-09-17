import { logger } from '../../utils/logger'
import { testRegex } from './regexTester'

export enum RuleLogic {
  AND = 'and',
  OR = 'or',
}

export enum ConditionMode {
  SIMPLE = 'simple',
  REGEX = 'regex',
}

export enum SimpleOperator {
  INCLUDE = 'include',
  NOT_INCLUDE = 'not_include',
  EQUAL = 'equal',
  NOT_EQUAL = 'not_equal',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  EMPTY = 'empty',
  NOT_EMPTY = 'not_empty',
}

export enum RegexOperator {
  REGEX = 'regex',
  NOT_REGEX = 'not_regex',
}

// 枚举值列表，供多值校验与遍历使用
export const RULE_LOGICS = Object.values(RuleLogic)
export const CONDITION_MODES = Object.values(ConditionMode)
export const SIMPLE_OPERATORS = Object.values(SimpleOperator)
export const REGEX_OPERATORS = Object.values(RegexOperator)
export const VALUE_OPTIONAL_OPERATORS = [SimpleOperator.EMPTY, SimpleOperator.NOT_EMPTY]
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

/**
 * 解析多值字段：接受数组或逗号分隔字符串，trim 去空去重
 */
export function parseMultiValue(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => String(item ?? '').trim()).filter(Boolean))]
  }
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
}

/**
 * 校验正则 pattern：非空、长度受限、语法可编译，任一不满足即抛错
 */
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

// 上下文按字段名取值，可用字段集由各业务域定义；正则匹配委托独立线程防灾难性回溯阻塞主线程
export async function matchCondition(context: Record<string, string>, condition: ConditionInput): Promise<boolean> {
  const fieldValue = context[condition.field] ?? ''
  if (condition.mode === ConditionMode.REGEX) {
    const reg = tryCompileRegex(condition.value)
    if (!reg) {
      logger.warn('[告警引擎] 条件正则编译失败，按不命中处理', { pattern: condition.value })
      return false
    }
    const hit = await testRegex(condition.value, fieldValue)
    return condition.operator === RegexOperator.NOT_REGEX ? !hit : hit
  }
  switch (condition.operator) {
    case SimpleOperator.INCLUDE:
      return fieldValue.includes(condition.value)
    case SimpleOperator.NOT_INCLUDE:
      return !fieldValue.includes(condition.value)
    case SimpleOperator.EQUAL:
      return fieldValue === condition.value
    case SimpleOperator.NOT_EQUAL:
      return fieldValue !== condition.value
    case SimpleOperator.STARTS_WITH:
      return fieldValue.startsWith(condition.value)
    case SimpleOperator.ENDS_WITH:
      return fieldValue.endsWith(condition.value)
    case SimpleOperator.EMPTY:
      return fieldValue === ''
    case SimpleOperator.NOT_EMPTY:
      return fieldValue !== ''
    default:
      return false
  }
}

// matched 仅由 conditions 与 logic 决定，业务范围过滤由各业务域叠加
export async function evaluateConditions(
  context: Record<string, string>,
  logic: string,
  conditions: ConditionInput[],
): Promise<{
  matched: boolean
  conditions: ConditionMatchResult[]
}> {
  const sorted = conditions
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  const results: ConditionMatchResult[] = await Promise.all(sorted.map(async (condition, index) => ({
    sort: condition.sort ?? index,
    matched: await matchCondition(context, condition),
  })))
  const hits = results.map(item => item.matched)
  return {
    matched: logic === RuleLogic.OR ? hits.some(Boolean) : hits.every(Boolean),
    conditions: results,
  }
}
