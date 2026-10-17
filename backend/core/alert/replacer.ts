import { logger } from '../../utils/logger'
import { assertValidRegexPattern } from './matcher'
import { replaceRegex } from './regexWorker'
import { REGEX_MAX_LENGTH, REPLACE_MAX_COUNT, REPLACE_REPLACEMENT_MAX_LENGTH, REPLACE_SCOPES } from './constants'

/** 替换作用域：both 标题和内容 / title 仅标题 / content 仅内容 */
export type ReplaceScope = (typeof REPLACE_SCOPES)[number]

/** 替换成对值：pattern 必填，replacement 可为空串（等价于删除命中内容） */
export interface ReplacePair {
  pattern: string
  replacement: string
  scope: ReplaceScope
}

function isReplaceScope(value: unknown): value is ReplaceScope {
  return typeof value === 'string' && (REPLACE_SCOPES as readonly string[]).includes(value)
}

function validateReplaceField(value: unknown, paramName: string): ReplacePair[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new Error(`参数 ${paramName} 无效（参数值类型错误）`)
  }
  return value.map((raw, index): ReplacePair => {
    const n = index + 1
    if (!isReplaceScope(raw?.scope)) {
      throw new Error(`参数 ${paramName} 第 ${n} 项的替换作用域无效`)
    }
    const pattern = typeof raw?.pattern === 'string' ? raw.pattern : ''
    // 正则首尾空白可能有语义，保持原值，仅用 trim 判空
    if (!pattern.trim()) {
      throw new Error(`参数 ${paramName} 第 ${n} 项的查找内容不能为空`)
    }
    if (pattern.length > REGEX_MAX_LENGTH) {
      throw new Error(`参数 ${paramName} 第 ${n} 项的查找内容长度不能超过 ${REGEX_MAX_LENGTH} 个字符`)
    }
    try {
      assertValidRegexPattern(pattern)
    }
    catch {
      throw new Error(`参数 ${paramName} 第 ${n} 项的查找内容不是有效的正则表达式`)
    }
    const replacement = typeof raw?.replacement === 'string' ? raw.replacement : ''
    if (replacement.length > REPLACE_REPLACEMENT_MAX_LENGTH) {
      throw new Error(`参数 ${paramName} 第 ${n} 项的替换内容长度不能超过 ${REPLACE_REPLACEMENT_MAX_LENGTH} 个字符`)
    }
    return { pattern, replacement, scope: raw.scope }
  })
}

/**
 * 校验替换成对值：单数组按 scope 区分作用域，条数即数组长度上限；空数组或未提供 = 不启用。
 * 返回清洗后的成对值数组，由 stringifyReplacePairs 序列化后落库。
 */
export function validateReplacePairs(value: unknown, paramName = 'replaces'): ReplacePair[] {
  const pairs = validateReplaceField(value, paramName)
  if (pairs.length > REPLACE_MAX_COUNT) {
    throw new Error(`替换条数不能超过 ${REPLACE_MAX_COUNT} 条`)
  }
  return pairs
}

/** 落库格式：JSON 数组串，空数组存空串 */
export function stringifyReplacePairs(pairs: ReplacePair[]): string {
  return pairs.length > 0 ? JSON.stringify(pairs) : ''
}

/** 读取落库值：空串或条目不完整按未启用处理（保存前已校验，此处只防落库内容损坏） */
export function parseReplacePairs(json: unknown): ReplacePair[] {
  const text = typeof json === 'string' ? json.trim() : ''
  if (!text) {
    return []
  }
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(item => !!item && typeof item === 'object' && typeof item.pattern === 'string' && isReplaceScope(item.scope))
      .map(item => ({
        pattern: item.pattern,
        replacement: typeof item.replacement === 'string' ? item.replacement : '',
        scope: item.scope,
      }))
  }
  catch {
    return []
  }
}

/** 匹配后替换可用变量，与一对一标题模板同套变量 */
export interface ReplaceVars {
  title: string
  rule: string
  receiver: string
}

const REPLACE_VAR_PATTERN = /\{\{(?:title|rule|receiver)\}\}/g

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expandReplaceVars(text: string, vars: ReplaceVars, escapeValue: (value: string) => string): string {
  if (!text.includes('{{'))
    return text
  return text.replace(REPLACE_VAR_PATTERN, matched => escapeValue(vars[matched.slice(2, -2) as keyof ReplaceVars]))
}

/**
 * 链式应用替换成对值：按数组序执行、全量替换（隐含 g），经 worker 执行防灾难性回溯。
 * 只取 scope 为 both 或与目标一致的条目；空串原样返回；单条超时或异常仅跳过该条，不中断后续替换。
 * 传入 vars 时展开变量：查找内容中按正则字面量转义，替换串中转义 $ 以字面量插入。
 */
export async function applyReplacements(input: string, json: string, scope: ReplaceScope, vars?: ReplaceVars): Promise<string> {
  const pairs = parseReplacePairs(json).filter(pair => pair.scope === 'both' || pair.scope === scope)
  if (pairs.length === 0) {
    return input
  }
  let result = input
  for (const [index, pair] of pairs.entries()) {
    const pattern = vars ? expandReplaceVars(pair.pattern, vars, escapeRegExp) : pair.pattern
    // $$$$ 经字符串替换产出 $$，后续作为替换串时还原为一个字面 $
    const replacement = vars ? expandReplaceVars(pair.replacement, vars, value => value.replace(/\$/g, '$$$$')) : pair.replacement
    const replaced = await replaceRegex(pattern, replacement, result)
    if (replaced === null) {
      logger.warn('[告警引擎] 替换执行超时或异常，跳过该条', JSON.stringify({ index: index + 1 }))
      continue
    }
    result = replaced
  }
  return result
}
