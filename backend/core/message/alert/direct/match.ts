import { logger } from '../../../../utils/logger'
import { matchRegexLines } from '../../../alert'
import { MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER } from './types'

export function escapeRegExp(text: string): string {
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

interface MatchedKeywordLine {
  line: string
  index: number
}

/**
 * 行首尾 trim、空行跳过后逐行匹配。
 * pattern 留空时按收信人标识做主线程包含匹配，不经 worker 也无 ReDoS 风险；
 * 非空时展开 {{receiver}} 占位符后委托正则 worker 防灾难性回溯阻塞主线程，index 为原文行号。
 * 返回 null 表示执行超时或异常（区别于零命中），由调用方决定语义
 */
export async function matchKeywordLines(pattern: string, receiver: string, content: string): Promise<MatchedKeywordLine[] | null> {
  const lines = content
    .split('\n')
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(item => item.line.length > 0)
  if (!pattern) {
    // 脏数据防御：收信人标识为空时 includes('') 恒真，会把所有行匹配上
    if (!receiver) {
      return []
    }
    return lines.filter(item => item.line.includes(receiver))
  }
  if (pattern.includes(MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_PLACEHOLDER) && !receiver) {
    logger.warn('[消息中心监控告警] 关键字使用收信人占位符但收信人标识为空，按不命中处理', { keyword: pattern })
    return []
  }
  const keyword = expandKeywordPattern(pattern, receiver)
  const results = await matchRegexLines(keyword, lines.map(item => item.line))
  if (results === null) {
    return null
  }
  return lines.filter((_, i) => results[i] === true)
}
