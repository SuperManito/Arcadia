import type { PushSession } from '../pushSession'
import type { MessageAlertDirectTitleMode } from './types'
import type { ReceiverPushConfig } from './overrides'
import { applyReplacements, parseReplacePairs } from '../../../alert'
import { isTitlelessChannel, TEMPLATE_TITLE_PLACEHOLDER } from '../../../channel'
import { enqueuePush } from '../pushQueue'
import { recordSessionFailure } from '../pushSession'
import {
  MESSAGE_ALERT_DIRECT_RULE_PLACEHOLDER,
  MESSAGE_ALERT_DIRECT_TITLE_RECEIVER_PLACEHOLDER,
} from './types'
import { isPatternBroken, matchDirectRule, prepareLines, resolveReceiverPattern } from './match'
import { readReceiverOverrides, resolveReceiverPushConfig } from './overrides'

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
 * 收信人只携带渠道 ID 与推送自定义串，渠道详情经去重后统一加载，避免同一渠道配置随每条收信人重复带出
 */
export interface DispatchableDirectRule {
  id: number
  name: string
  title_mode: string
  title_template: string
  title_merge: number
  channel_merge: number
  pre_replaces: string
  post_replaces: string
  common_pattern: string
  receivers: Array<{
    receiver: string
    overrides: string
    channelIds: number[]
  }>
}

// 按推送单元聚合命中行：默认逐收信人逐渠道各成一条推送；开启合并推送后同渠道且有效推送形态一致的收信人并为一单元，
// 行序按原文还原，行文本去重
export async function processDirectRule(
  directRule: DispatchableDirectRule,
  channelsById: Map<number, ChannelSnapshot>,
  msg: { title: string, content: string },
  session: PushSession,
) {
  if (directRule.receivers.length === 0) {
    return
  }
  const mergeMode = directRule.channel_merge === 1
  // 内容替换在收信人匹配前对整条消息执行一次，命中行即推送行；执行失败跳过该条替换按原文继续
  const content = await applyReplacements(msg.content, directRule.pre_replaces, 'content')
  const candidates = directRule.receivers
    .filter(receiver => receiver.channelIds.length > 0)
    .map((receiver) => {
      const overrides = readReceiverOverrides(receiver.overrides)
      const pushConfig = resolveReceiverPushConfig(overrides, directRule)
      return {
        receiver: receiver.receiver,
        channelIds: receiver.channelIds,
        // 统一解析生效模式串（收信人正则 > 全局正则 > 标识包含），留空走主线程标识包含
        pattern: resolveReceiverPattern(overrides.pattern ?? '', directRule.common_pattern).pattern,
        pushConfig,
        // 合并分组只看标题侧有效形态，内容侧替换已在逐行阶段作用完毕不影响标题；非合并模式分组键用收信人标识，不解析替换对
        titleSideKey: mergeMode
          ? JSON.stringify([
              pushConfig.titleMode,
              pushConfig.titleTemplate,
              pushConfig.titleMerge,
              parseReplacePairs(pushConfig.postReplaces).filter(pair => pair.scope !== 'content'),
            ])
          : '',
      }
    })
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
  const pushUnits = new Map<string, { channel: ChannelSnapshot, config: ReceiverPushConfig, indexes: Map<string, number>, receivers: Set<string> }>()
  for (const [i, candidate] of activeCandidates.entries()) {
    const matched = matchResults[i]
    if (matched === null) {
      // 匹配超时或异常记入失败会话，静默漏发会让收信人既收不到也无从排查
      for (const channelId of candidate.channelIds) {
        const channel = channelsById.get(channelId)
        if (!channel) {
          continue
        }
        recordSessionFailure(session, {
          ruleName: directRule.name,
          channelName: channel.name,
          channelType: channel.type,
          reason: `收信人「${candidate.receiver}」正则匹配超时或异常，未推送`,
        })
      }
      continue
    }
    if (matched.length === 0) {
      continue
    }
    // 匹配后替换按收信人逐行执行，命中行清洗后才参与推送单元聚合与去重；清空成空串的行不再推送
    const lineVars = { title: msg.title, rule: directRule.name, receiver: candidate.receiver }
    const replacedLines: Array<{ line: string, index: number }> = []
    for (const { line, index } of matched) {
      const replaced = (await applyReplacements(line, candidate.pushConfig.postReplaces, 'content', lineVars)).trim()
      if (replaced) {
        replacedLines.push({ line: replaced, index })
      }
    }
    if (replacedLines.length === 0) {
      continue
    }
    for (const channelId of candidate.channelIds) {
      const channel = channelsById.get(channelId)
      if (!channel) {
        continue
      }
      const unitKey = mergeMode ? `${channelId}\n${candidate.titleSideKey}` : `${channelId}\n${candidate.receiver}`
      let unit = pushUnits.get(unitKey)
      if (!unit) {
        unit = { channel, config: candidate.pushConfig, indexes: new Map(), receivers: new Set() }
        pushUnits.set(unitKey, unit)
      }
      unit.receivers.add(candidate.receiver)
      for (const { line, index } of replacedLines) {
        if (!unit.indexes.has(line)) {
          unit.indexes.set(line, index)
        }
      }
    }
  }
  if (pushUnits.size === 0) {
    return
  }
  // 标题按推送单元渲染（{{receiver}} 各单元不同），渲染结果去重后替换，避免渠道数百级时重复占用 worker
  const titleCache = new Map<string, string>()
  for (const { channel, config, indexes, receivers } of pushUnits.values()) {
    const orderedLines = [...indexes.entries()].sort((a, b) => a[1] - b[1]).map(([line]) => line)
    const pushContent = orderedLines.join('\n')
    const receiverLabels = [...receivers].join('、')
    const cacheKey = `${config.titleMode}\n${config.titleTemplate}\n${config.postReplaces}\n${receiverLabels}`
    let title = titleCache.get(cacheKey)
    if (title === undefined) {
      const renderedTitle = renderDirectTitle(config.titleMode, config.titleTemplate, msg.title, directRule.name, receiverLabels)
      title = await applyReplacements(renderedTitle, directRule.pre_replaces, 'title')
      title = await applyReplacements(title, config.postReplaces, 'title', { title: msg.title, rule: directRule.name, receiver: receiverLabels })
      titleCache.set(cacheKey, title)
    }
    // 置空串交由推送层清理拼接残留
    enqueuePush(
      channel,
      { title: config.titleMerge === 0 && isTitlelessChannel(channel.type) ? '' : title, content: pushContent },
      { ruleName: directRule.name },
      session,
    )
  }
}
