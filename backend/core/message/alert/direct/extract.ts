import { testRegexLines } from '../../../alert/regexTester'

// 单次提取上限：超限截断，防止单条消息命中数百行把渠道内容撑爆
export const MESSAGE_ALERT_DIRECT_EXTRACT_MAX_LINES = 50

export interface MessageAlertDirectExtractResult {
  lines: string[]
  truncated: boolean
  total: number
}

/**
 * 截取正则逐行提取：命中行按原文顺序返回。
 * 返回 null 表示正则执行超时或 worker 故障，对齐 AL-01 按无提取处理（不推送）。
 */
export async function extractMatchedLines(extractRegex: string, content: string): Promise<MessageAlertDirectExtractResult | null> {
  const matched = await testRegexLines(extractRegex, content)
  if (matched === null) {
    return null
  }
  if (matched.length > MESSAGE_ALERT_DIRECT_EXTRACT_MAX_LINES) {
    return {
      lines: matched.slice(0, MESSAGE_ALERT_DIRECT_EXTRACT_MAX_LINES),
      truncated: true,
      total: matched.length,
    }
  }
  return { lines: matched, truncated: false, total: matched.length }
}
