import type { MessageAlertDirectTitleMode } from './types'
import { logger } from '../../../../utils/logger'
import { matchRegexLines } from '../../../alert/regexTester'
import { MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER } from './types'

// 单关键字命中行上限：超限截断，防止单条消息命中数百行把渠道内容撑爆
export const MESSAGE_ALERT_DIRECT_MATCH_MAX_LINES = 50

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 模式串中的 {{receiver}} 占位符展开为正则转义后的收信人标识，使同一份模式模板可在多行间机械复用
 */
export function expandKeywordPattern(pattern: string, receiver: string): string {
  if (!pattern.includes(MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER))
    return pattern
  return pattern.split(MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER).join(escapeRegExp(receiver))
}

export interface MessageAlertDirectMatchResult {
  lines: string[]
  truncated: boolean
  total: number
}

export interface MatchedKeywordLine {
  line: string
  index: number
  matched: string
}

/**
 * 行首尾 trim、空行跳过后逐行匹配，委托 regexTester worker 防灾难性回溯阻塞主线程；
 * index 为原文行号、matched 为命中片段，执行异常按零命中处理
 */
export async function matchKeywordLineIndexes(pattern: string, receiver: string, content: string): Promise<MatchedKeywordLine[]> {
  if (pattern.includes(MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER) && !receiver) {
    logger.warn('[消息中心监控告警] 关键字使用收信人占位符但收信人标识为空，按不命中处理', { keyword: pattern })
    return []
  }
  const keyword = expandKeywordPattern(pattern, receiver)
  const lines = content
    .split('\n')
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(item => item.line.length > 0)
  const results = await matchRegexLines(keyword, lines.map(item => item.line))
  if (results === null) {
    logger.warn('[消息中心监控告警] 关键字正则执行超时或异常，按不命中处理', { keyword })
    return []
  }
  return lines.reduce<MatchedKeywordLine[]>((acc, item, i) => {
    const matched = results[i]
    if (matched !== null) {
      acc.push({ ...item, matched })
    }
    return acc
  }, [])
}

export function truncateMatchedLines(lines: string[]): MessageAlertDirectMatchResult {
  if (lines.length > MESSAGE_ALERT_DIRECT_MATCH_MAX_LINES) {
    return {
      lines: lines.slice(0, MESSAGE_ALERT_DIRECT_MATCH_MAX_LINES),
      truncated: true,
      total: lines.length,
    }
  }
  return { lines, truncated: false, total: lines.length }
}

export function renderDirectTitle(
  titleMode: MessageAlertDirectTitleMode,
  titleTemplate: string,
  originalTitle: string,
  ruleName: string,
  keyword = '',
): string {
  if (titleMode === 'none') {
    return ''
  }
  if (titleMode === 'custom') {
    return titleTemplate
      .replaceAll('{{title}}', originalTitle)
      .replaceAll('{{rule}}', ruleName)
      .replaceAll('{{keyword}}', keyword)
  }
  return originalTitle
}
