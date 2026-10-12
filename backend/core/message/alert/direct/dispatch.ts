import type { PushSession } from '../pushSession'
import type { MessageAlertDirectTitleMode } from './types'
import { applyReplacements } from '../../../alert'
import { TEMPLATE_TITLE_PLACEHOLDER } from '../../../channel'
import { enqueuePush } from '../pushQueue'
import { recordSessionFailure } from '../pushSession'
import { MESSAGE_ALERT_DIRECT_KEYWORD_PLACEHOLDER, MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER } from './types'
import { matchKeywordLines, truncateMatchedLines } from './match'

/**
 * processDirectRule 所需的最小规则结构：调用方传入数据库关联查询结果，字段子集即可
 */
export interface DispatchableDirectRule {
  id: number
  name: string
  title_mode: string
  title_template: string
  content_replace: string
  title_replace: string
  keywords: Array<{
    keyword: string
    receiver: string
    channels: Array<{
      channelId: number
      channel: { id: number, name: string, type: string, config: string }
    }>
  }>
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
      .replaceAll(TEMPLATE_TITLE_PLACEHOLDER, originalTitle)
      .replaceAll(MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER, ruleName)
      .replaceAll(MESSAGE_ALERT_DIRECT_KEYWORD_PLACEHOLDER, keyword)
  }
  return originalTitle
}

// 按渠道聚合命中行：多关键字绑定同一渠道时合并为一次推送，行序按原文还原，行文本去重
export async function processDirectRule(
  directRule: DispatchableDirectRule,
  msg: { title: string, content: string },
  session: PushSession,
) {
  if (directRule.keywords.length === 0) {
    return
  }
  // 内容替换在关键字匹配前对整条消息执行一次，命中行即推送行；执行失败跳过该条替换按原文继续
  const content = await applyReplacements(msg.content, directRule.content_replace)
  const channelLines = new Map<number, { channel: DispatchableDirectRule['keywords'][number]['channels'][number]['channel'], indexes: Map<string, number>, keywords: { keyword: string, receiver: string }[] }>()
  for (const keyword of directRule.keywords) {
    const matched = await matchKeywordLines(keyword.keyword, keyword.receiver, content)
    if (matched === null) {
      // 匹配超时或异常记入失败会话，静默漏发会让收信人既收不到也无从排查
      for (const link of keyword.channels) {
        recordSessionFailure(session, {
          ruleName: directRule.name,
          channelName: link.channel.name,
          channelType: link.channel.type,
          reason: `关键字匹配超时或异常，收信人「${keyword.receiver || keyword.keyword}」未推送`,
          content: '',
        })
      }
      continue
    }
    if (matched.length === 0) {
      continue
    }
    for (const link of keyword.channels) {
      let entry = channelLines.get(link.channelId)
      if (!entry) {
        entry = { channel: link.channel, indexes: new Map(), keywords: [] }
        channelLines.set(link.channelId, entry)
      }
      if (!entry.keywords.some(item => item.keyword === keyword.keyword && item.receiver === keyword.receiver)) {
        entry.keywords.push({ keyword: keyword.keyword, receiver: keyword.receiver })
      }
      matched.forEach(({ line, index }) => {
        if (!entry.indexes.has(line)) {
          entry.indexes.set(line, index)
        }
      })
    }
  }
  if (channelLines.size === 0) {
    return
  }
  // 标题按渠道渲染（{{keyword}} 各渠道不同），渲染结果去重后替换，避免渠道数百级时重复占用 worker
  const titleCache = new Map<string, string>()
  for (const { channel, indexes, keywords } of channelLines.values()) {
    const orderedLines = [...indexes.entries()].sort((a, b) => a[1] - b[1]).map(([line]) => line)
    const match = truncateMatchedLines(orderedLines)
    const pushContent = match.truncated
      ? `${match.lines.join('\n')}\n……（已截断，共命中 ${match.total} 行）`
      : match.lines.join('\n')
    // {{keyword}} 填充收信人标识，未填时回退正则模式串
    const keywordLabels = [...new Set(keywords.map(({ keyword, receiver }) => receiver || keyword))]
    const renderedTitle = renderDirectTitle(directRule.title_mode as MessageAlertDirectTitleMode, directRule.title_template, msg.title, directRule.name, keywordLabels.join('、'))
    let title = titleCache.get(renderedTitle)
    if (title === undefined) {
      title = await applyReplacements(renderedTitle, directRule.title_replace)
      titleCache.set(renderedTitle, title)
    }
    enqueuePush(
      channel,
      { title, content: pushContent },
      { ruleName: directRule.name },
      session,
    )
  }
}
