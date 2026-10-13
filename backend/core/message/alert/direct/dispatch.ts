import type { PushSession } from '../pushSession'
import type { MessageAlertDirectTitleMode } from './types'
import { applyReplacements } from '../../../alert'
import { TEMPLATE_TITLE_PLACEHOLDER } from '../../../channel'
import { enqueuePush } from '../pushQueue'
import { recordSessionFailure } from '../pushSession'
import { MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER, MESSAGE_ALERT_DIRECT_TITLE_RECEIVER_PLACEHOLDER } from './types'
import { matchKeywordLines } from './match'

/**
 * processDirectRule 所需的最小规则结构：调用方传入数据库关联查询结果，字段子集即可；
 * 收信人只携带渠道 ID，渠道详情经去重后统一加载，避免同一渠道配置随每条收信人重复带出
 */
export interface DispatchableDirectRule {
  id: number
  name: string
  title_mode: string
  title_template: string
  content_replace: string
  title_replace: string
  keywords: Array<{
    pattern: string
    receiver: string
    channelIds: number[]
  }>
}

export interface ChannelSnapshot { id: number, name: string, type: string, config: string }

export function renderDirectTitle(
  titleMode: MessageAlertDirectTitleMode,
  titleTemplate: string,
  originalTitle: string,
  ruleName: string,
  receiver = '',
): string {
  if (titleMode === 'none') {
    return ''
  }
  if (titleMode === 'template') {
    return titleTemplate
      .replaceAll(TEMPLATE_TITLE_PLACEHOLDER, originalTitle)
      .replaceAll(MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER, ruleName)
      .replaceAll(MESSAGE_ALERT_DIRECT_TITLE_RECEIVER_PLACEHOLDER, receiver)
  }
  return originalTitle
}

// 规则内收信人匹配的有限并发：worker 队列上限 200，数千条自定义模式不能一次性全量提交
const MATCH_CONCURRENCY = 4

// 按渠道聚合命中行：多收信人绑定同一渠道时合并为一次推送，行序按原文还原，行文本去重
export async function processDirectRule(
  directRule: DispatchableDirectRule,
  channelsById: Map<number, ChannelSnapshot>,
  msg: { title: string, content: string },
  session: PushSession,
) {
  if (directRule.keywords.length === 0) {
    return
  }
  // 内容替换在收信人匹配前对整条消息执行一次，命中行即推送行；执行失败跳过该条替换按原文继续
  const content = await applyReplacements(msg.content, directRule.content_replace)
  const candidates = directRule.keywords.filter(keyword => keyword.channelIds.length > 0)
  const matchResults = await mapWithConcurrency(candidates, MATCH_CONCURRENCY, async (keyword) => {
    return matchKeywordLines(keyword.pattern, keyword.receiver, content)
  })
  const channelLines = new Map<number, { channel: ChannelSnapshot, indexes: Map<string, number>, receivers: Set<string> }>()
  for (const [i, keyword] of candidates.entries()) {
    const matched = matchResults[i]
    if (matched === null) {
      // 匹配超时或异常记入失败会话，静默漏发会让收信人既收不到也无从排查
      for (const channelId of keyword.channelIds) {
        const channel = channelsById.get(channelId)
        if (!channel) {
          continue
        }
        recordSessionFailure(session, {
          ruleName: directRule.name,
          channelName: channel.name,
          channelType: channel.type,
          reason: `收信人「${keyword.receiver}」正则匹配超时或异常，未推送`,
          content: '',
        })
      }
      continue
    }
    if (matched.length === 0) {
      continue
    }
    for (const channelId of keyword.channelIds) {
      const channel = channelsById.get(channelId)
      if (!channel) {
        continue
      }
      let entry = channelLines.get(channelId)
      if (!entry) {
        entry = { channel, indexes: new Map(), receivers: new Set() }
        channelLines.set(channelId, entry)
      }
      entry.receivers.add(keyword.receiver)
      for (const { line, index } of matched) {
        if (!entry.indexes.has(line)) {
          entry.indexes.set(line, index)
        }
      }
    }
  }
  if (channelLines.size === 0) {
    return
  }
  // 标题按渠道渲染（{{receiver}} 各渠道不同），渲染结果去重后替换，避免渠道数百级时重复占用 worker
  const titleCache = new Map<string, string>()
  for (const { channel, indexes, receivers } of channelLines.values()) {
    const orderedLines = [...indexes.entries()].sort((a, b) => a[1] - b[1]).map(([line]) => line)
    const pushContent = orderedLines.join('\n')
    const receiverLabels = [...receivers].join('、')
    const renderedTitle = renderDirectTitle(directRule.title_mode as MessageAlertDirectTitleMode, directRule.title_template, msg.title, directRule.name, receiverLabels)
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

// 有限并发遍历，结果与输入顺序对齐
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}
