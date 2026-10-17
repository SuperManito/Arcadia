import type { PushSession } from '../pushSession'
import type { MessageAlertDirectTitleMode } from './types'
import { applyReplacements } from '../../../alert'
import { isTitlelessChannel, TEMPLATE_TITLE_PLACEHOLDER } from '../../../channel'
import { enqueuePush } from '../pushQueue'
import { recordSessionFailure } from '../pushSession'
import {
  MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER,
  MESSAGE_ALERT_DIRECT_TITLE_RECEIVER_PLACEHOLDER,
} from './types'
import { isPatternBroken, matchDirectRule, prepareLines, resolveReceiverPattern } from './match'

const DIRECT_TITLE_PLACEHOLDER_PATTERN = new RegExp(
  `\\{\\{(?:${[
    TEMPLATE_TITLE_PLACEHOLDER,
    MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER,
    MESSAGE_ALERT_DIRECT_TITLE_RECEIVER_PLACEHOLDER,
  ].map(name => name.slice(2, -2)).join('|')})\\}\\}`,
  'g',
)

export interface ChannelSnapshot { id: number, name: string, type: string, config: string }

export function renderDirectTitle(
  titleMode: MessageAlertDirectTitleMode,
  titleTemplate: string,
  originalTitle: string,
  ruleName: string,
  receiver = '',
): string {
  if (titleMode === 'template') {
    // 单遍替换，标题模板或替换值中的字面量占位符不会被二次展开
    return titleTemplate.replace(DIRECT_TITLE_PLACEHOLDER_PATTERN, matched => matched === TEMPLATE_TITLE_PLACEHOLDER
      ? originalTitle
      : matched === MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER
        ? ruleName
        : receiver)
  }
  return originalTitle
}

/**
 * processDirectRule 所需的最小规则结构：调用方传入数据库关联查询结果，字段子集即可；
 * 收信人只携带渠道 ID，渠道详情经去重后统一加载，避免同一渠道配置随每条收信人重复带出
 */
export interface DispatchableDirectRule {
  id: number
  name: string
  title_mode: string
  title_template: string
  title_merge: number
  replaces: string
  common_pattern: string
  receivers: Array<{
    pattern: string
    receiver: string
    channelIds: number[]
  }>
}

// 按渠道聚合命中行：多收信人绑定同一渠道时合并为一次推送，行序按原文还原，行文本去重
export async function processDirectRule(
  directRule: DispatchableDirectRule,
  channelsById: Map<number, ChannelSnapshot>,
  msg: { title: string, content: string },
  session: PushSession,
) {
  if (directRule.receivers.length === 0) {
    return
  }
  // 内容替换在收信人匹配前对整条消息执行一次，命中行即推送行；执行失败跳过该条替换按原文继续
  const content = await applyReplacements(msg.content, directRule.replaces, 'content')
  const candidates = directRule.receivers
    .filter(receiver => receiver.channelIds.length > 0)
    // 统一解析生效模式串（收信人正则 > 全局正则 > 标识包含），留空走主线程标识包含
    .map(receiver => ({ ...receiver, pattern: resolveReceiverPattern(receiver.pattern, directRule.common_pattern).pattern }))
  // 正文只切分一次供全部收信人共用，匹配内部分批让出事件循环
  const lines = prepareLines(content)
  // 熔断中的模式不再送 worker，避免每次消息都空耗 500ms 超时；按模式聚合后每个受影响渠道记一行失败
  const activeCandidates: typeof candidates = []
  const brokenByPattern = new Map<string, typeof candidates>()
  for (const receiver of candidates) {
    if (isPatternBroken(receiver.pattern)) {
      const group = brokenByPattern.get(receiver.pattern)
      if (group) {
        group.push(receiver)
      }
      else {
        brokenByPattern.set(receiver.pattern, [receiver])
      }
    }
    else {
      activeCandidates.push(receiver)
    }
  }
  for (const [pattern, group] of brokenByPattern) {
    const label = pattern.length > 50 ? `${pattern.slice(0, 50)}…` : pattern
    const channelCounts = new Map<number, number>()
    for (const receiver of group) {
      for (const channelId of receiver.channelIds) {
        channelCounts.set(channelId, (channelCounts.get(channelId) ?? 0) + 1)
      }
    }
    for (const [channelId, count] of channelCounts) {
      const channel = channelsById.get(channelId)
      if (!channel) {
        continue
      }
      recordSessionFailure(session, {
        ruleName: directRule.name,
        channelName: channel.name,
        channelType: channel.type,
        reason: `「${label}」已熔断，${count} 个收信人按不命中处理`,
      })
    }
  }
  const matchResults = activeCandidates.length > 0 ? await matchDirectRule(lines, activeCandidates) : []
  const channelLines = new Map<number, { channel: ChannelSnapshot, indexes: Map<string, number>, receivers: Set<string> }>()
  for (const [i, receiver] of activeCandidates.entries()) {
    const matched = matchResults[i]
    if (matched === null) {
      // 匹配超时或异常记入失败会话，静默漏发会让收信人既收不到也无从排查
      for (const channelId of receiver.channelIds) {
        const channel = channelsById.get(channelId)
        if (!channel) {
          continue
        }
        recordSessionFailure(session, {
          ruleName: directRule.name,
          channelName: channel.name,
          channelType: channel.type,
          reason: `收信人「${receiver.receiver}」正则匹配超时或异常，未推送`,
        })
      }
      continue
    }
    if (matched.length === 0) {
      continue
    }
    for (const channelId of receiver.channelIds) {
      const channel = channelsById.get(channelId)
      if (!channel) {
        continue
      }
      let entry = channelLines.get(channelId)
      if (!entry) {
        entry = { channel, indexes: new Map(), receivers: new Set() }
        channelLines.set(channelId, entry)
      }
      entry.receivers.add(receiver.receiver)
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
    const renderedTitle = renderDirectTitle(
      directRule.title_mode as MessageAlertDirectTitleMode,
      directRule.title_template,
      msg.title,
      directRule.name,
      receiverLabels,
    )
    let title = titleCache.get(renderedTitle)
    if (title === undefined) {
      title = await applyReplacements(renderedTitle, directRule.replaces, 'title')
      titleCache.set(renderedTitle, title)
    }
    // 置空串交由推送层清理拼接残留
    enqueuePush(
      channel,
      { title: directRule.title_merge === 0 && isTitlelessChannel(channel.type) ? '' : title, content: pushContent },
      { ruleName: directRule.name },
      session,
    )
  }
}
