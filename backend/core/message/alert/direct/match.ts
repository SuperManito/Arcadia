import type { MessageAlertDirectTitleMode } from './types'

// 单关键字命中行上限：超限截断，防止单条消息命中数百行把渠道内容撑爆
export const MESSAGE_ALERT_DIRECT_MATCH_MAX_LINES = 50

export interface MessageAlertDirectMatchResult {
  lines: string[]
  truncated: boolean
  total: number
}

export interface MatchedKeywordLine {
  line: string
  index: number
}

/**
 * 行首尾 trim、空行跳过后做子串包含匹配；index 为命中行在原文中的行号，供聚合后还原行序
 */
export function matchKeywordLineIndexes(keyword: string, content: string): MatchedKeywordLine[] {
  return content
    .split('\n')
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(item => item.line.length > 0 && item.line.includes(keyword))
}

export function matchKeywordLines(keyword: string, content: string): string[] {
  return matchKeywordLineIndexes(keyword, content).map(item => item.line)
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
