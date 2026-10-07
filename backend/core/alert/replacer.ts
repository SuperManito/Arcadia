import { logger } from '../../utils/logger'
import { assertValidRegexPattern, REGEX_MAX_LENGTH } from './matcher'
import { replaceRegex } from './regexTester'

export const REPLACE_TEXT_MAX_LENGTH = 2000
export const REPLACE_REPLACEMENT_MAX_LENGTH = 256

export interface ParsedReplaceExpression {
  pattern: string
  replacement: string
}

// 解析单条 s/正则/替换串/：按未转义的 / 切分，要求恰好三段且末段为空（不允许尾随标志）；非法返回 null
function parseExpression(line: string): ParsedReplaceExpression | null {
  if (!line.startsWith('s/')) {
    return null
  }
  const parts: string[] = []
  let current = ''
  let escaped = false
  for (const ch of line.slice(2)) {
    if (escaped) {
      current += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      current += ch
      escaped = true
      continue
    }
    if (ch === '/') {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (escaped) {
    return null
  }
  parts.push(current)
  if (parts.length !== 3 || parts[2] !== '') {
    return null
  }
  return {
    // 正则中字面 / 写 \/ ；\n 保持原样作为正则换行元字符
    pattern: parts[0].replace(/\\\//g, '/'),
    replacement: parts[1].replace(/\\\//g, '/').replace(/\\n/g, '\n'),
  }
}

/**
 * 校验替换文本：空串放行（不启用）；逐行要求合法 s/正则/替换串/，错误信息带行号。
 * 返回 trim 后的规范化文本，供落库使用。
 */
export function validateReplaceText(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    return ''
  }
  if (text.length > REPLACE_TEXT_MAX_LENGTH) {
    throw new Error(`替换表达式总长度不能超过 ${REPLACE_TEXT_MAX_LENGTH} 个字符`)
  }
  for (const [index, line] of text.split('\n').entries()) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const parsed = parseExpression(trimmed)
    if (!parsed) {
      throw new Error(`替换表达式第 ${index + 1} 行无效，格式应为 s/正则/替换串/`)
    }
    if (parsed.pattern.length > REGEX_MAX_LENGTH) {
      throw new Error(`替换表达式第 ${index + 1} 行的正则长度不能超过 ${REGEX_MAX_LENGTH} 个字符`)
    }
    try {
      assertValidRegexPattern(parsed.pattern)
    }
    catch {
      throw new Error(`替换表达式第 ${index + 1} 行的正则无效`)
    }
    if (parsed.replacement.length > REPLACE_REPLACEMENT_MAX_LENGTH) {
      throw new Error(`替换表达式第 ${index + 1} 行的替换串长度不能超过 ${REPLACE_REPLACEMENT_MAX_LENGTH} 个字符`)
    }
  }
  return text
}

/**
 * 链式应用替换文本：每条按行序执行、全量替换（隐含 g），经 worker 执行防灾难性回溯。
 * 空文本原样返回；单条无效或超时仅跳过该条，不中断后续替换。
 */
export async function applyReplacements(input: string, text: string): Promise<string> {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) {
    return input
  }
  let result = input
  for (const [index, line] of raw.split('\n').entries()) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const parsed = parseExpression(trimmed)
    if (!parsed) {
      logger.warn('[告警引擎] 替换表达式无效，跳过该条', { line: index + 1 })
      continue
    }
    const replaced = await replaceRegex(parsed.pattern, parsed.replacement, result)
    if (replaced === null) {
      logger.warn('[告警引擎] 替换执行超时或异常，跳过该条', { line: index + 1 })
      continue
    }
    result = replaced
  }
  return result
}
