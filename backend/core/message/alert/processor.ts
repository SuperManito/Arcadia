import type { messageModel } from '../../../db'
import type { MessageAlertContext, MessageAlertRuleInput } from './types'
import type { MessageAlertDirectTitleMode } from './direct/types'
import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import {
  evaluateConditions,
  parseMultiValue,
} from '../../alert/matcher'
import { applyReplacements } from '../../alert/replacer'
import { MessageCategory, MessageType } from '../../type/message'
import { pushChannel } from '../../channel'
import { sendMessage } from '../index'
import { enqueueDirectPush } from './direct/directQueue'
import { matchKeywordLineIndexes, renderDirectTitle, truncateMatchedLines } from './direct/match'

// categories / types 为空表示不限制
function matchMessageAlertFilters(msg: MessageAlertContext, rule: MessageAlertRuleInput): boolean {
  const categories = parseMultiValue(rule.categories)
  if (categories.length > 0 && !categories.includes(msg.category)) {
    return false
  }
  const types = parseMultiValue(rule.types)
  if (types.length > 0 && !types.includes(msg.type)) {
    return false
  }
  return true
}

// 返回逐条条件结果，供测试接口展示命中明细；matched 含分类/级别范围过滤
export async function evaluateMessageAlertRule(msg: MessageAlertContext, rule: MessageAlertRuleInput): Promise<{
  matched: boolean
  conditions: Array<{ sort: number, matched: boolean }>
}> {
  // 范围过滤不通过时跳过条件求值，此时 conditions 为空数组
  if (!matchMessageAlertFilters(msg, rule)) {
    return {
      matched: false,
      conditions: [],
    }
  }
  const conditionResult = await evaluateConditions({
    title: msg.title,
    content: msg.content,
  }, rule.logic, rule.conditions)
  return {
    matched: conditionResult.matched,
    conditions: conditionResult.conditions,
  }
}

export async function matchMessageAlertRule(
  msg: MessageAlertContext,
  rule: MessageAlertRuleInput,
): Promise<boolean> {
  return (await evaluateMessageAlertRule(msg, rule)).matched
}

async function loadEnabledRules() {
  return db.messageAlertRule.$list(
    { where: { enabled: 1 } },
    {
      include: {
        conditions: { orderBy: { sort: 'asc' } },
        channels: { include: { channel: true } },
        directs: {
          where: { directRule: { enabled: 1 } },
          include: {
            directRule: {
              include: {
                keywords: {
                  where: { enabled: 1 },
                  orderBy: { sort: 'asc' },
                  include: { channels: { include: { channel: true } } },
                },
              },
            },
          },
        },
      },
    },
  )
}

// 是否可能存在启用规则的内存标记：false 时跳过查询，仅由规则增删改路径经 refreshHasEnabledRules 刷新；初值 true 保证重启后已有规则不漏判
let hasEnabledRules = true

/**
 * 规则增删改后刷新启用标记；失败只记日志不抛出，标记失真仅影响一次额外查询或漏判，不应阻断调用方
 */
export async function refreshHasEnabledRules() {
  try {
    hasEnabledRules = (await db.messageAlertRule.count({ where: { enabled: 1 } })) > 0
  }
  catch (e: any) {
    logger.error('[消息中心监控告警] 刷新启用规则标记失败', { error: e?.message })
  }
}

/**
 * 告警处理入口：命中规则与关联渠道两级并发推送，由消息入库路径非阻塞调用
 */
export async function processMessageAlert(msg: messageModel) {
  if (!hasEnabledRules) {
    return
  }
  const rules = await loadEnabledRules()

  // 同一一对一规则可被多条命中规则挂载，单条消息只处理一次
  const processedDirectRuleIds = new Set<number>()
  const context = { title: msg.title, content: msg.content, category: msg.category, type: msg.type }
  await Promise.all(rules.map(async (rule) => {
    try {
      await processRule(rule, msg, context, processedDirectRuleIds)
    }
    catch (e: any) {
      logger.error('[消息中心监控告警] 规则处理异常', {
        ruleId: rule.id,
        ruleName: rule.name,
        error: e?.message,
      })
    }
  }))
}

// allSettled 保证单规则 / 单渠道失败不影响其余
async function processRule(
  rule: Awaited<ReturnType<typeof loadEnabledRules>>[number],
  msg: messageModel,
  context: MessageAlertContext,
  processedDirectRuleIds: Set<number>,
) {
  if (rule.channels.length === 0 && rule.directs.length === 0) {
    return
  }
  const hit = await matchMessageAlertRule(context, {
    logic: rule.logic,
    categories: rule.categories,
    types: rule.types,
    conditions: rule.conditions.map(condition => ({
      mode: condition.mode,
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      sort: condition.sort,
    })),
  })
  if (!hit) {
    return
  }
  // 替换只作用于推送副本，一对一规则的输入保持原文；按规则算一次供全部渠道复用
  if (rule.channels.length > 0) {
    const pushTitle = await applyReplacements(msg.title, rule.title_replace)
    const pushContent = await applyReplacements(msg.content, rule.content_replace)
    await Promise.allSettled(rule.channels.map(async (link) => {
      const result = await pushChannel(
        { type: link.channel.type, config: link.channel.config },
        { title: pushTitle, content: pushContent },
      )
      if (result.success) {
        return
      }
      logger.error('[消息中心监控告警] 渠道发送失败', {
        ruleId: rule.id,
        ruleName: rule.name,
        channelId: link.channel.id,
        channelName: link.channel.name,
        channelType: link.channel.type,
        error: result.error,
      })
      void sendMessage({
        title: '告警消息推送失败',
        content: `触发消息：${msg.title}\n规则：${rule.name}\n渠道：${link.channel.name}（${link.channel.type}）\n错误：${result.error}`,
        category: MessageCategory.SYSTEM,
        type: MessageType.ERROR,
        skipAlert: true,
      }).catch(() => {})
    }))
  }

  await Promise.allSettled(rule.directs.map(async (link) => {
    if (processedDirectRuleIds.has(link.directRuleId)) {
      return
    }
    processedDirectRuleIds.add(link.directRuleId)
    try {
      await processDirectRule(link.directRule, msg)
    }
    catch (e: any) {
      logger.error('[消息中心监控告警] 一对一规则处理异常', {
        directRuleId: link.directRuleId,
        directRuleName: link.directRule.name,
        error: e?.message,
      })
    }
  }))
}

// 按渠道聚合命中行：多关键字绑定同一渠道时合并为一次推送，行序按原文还原，行文本去重
async function processDirectRule(
  directRule: Awaited<ReturnType<typeof loadEnabledRules>>[number]['directs'][number]['directRule'],
  msg: messageModel,
) {
  if (directRule.keywords.length === 0) {
    return
  }
  const channelLines = new Map<number, { channel: (typeof directRule.keywords)[number]['channels'][number]['channel'], indexes: Map<string, number>, keywords: string[] }>()
  for (const keyword of directRule.keywords) {
    const matched = matchKeywordLineIndexes(keyword.keyword, msg.content)
    if (matched.length === 0) {
      continue
    }
    for (const link of keyword.channels) {
      let entry = channelLines.get(link.channelId)
      if (!entry) {
        entry = { channel: link.channel, indexes: new Map(), keywords: [] }
        channelLines.set(link.channelId, entry)
      }
      if (!entry.keywords.includes(keyword.keyword)) {
        entry.keywords.push(keyword.keyword)
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
  await Promise.allSettled([...channelLines.values()].map(async ({ channel, indexes, keywords }) => {
    const orderedLines = [...indexes.entries()].sort((a, b) => a[1] - b[1]).map(([line]) => line)
    // 替换在聚合去重后按原文逐行执行，截断行数按替换前计
    const replacedLines = await Promise.all(orderedLines.map(line => applyReplacements(line, directRule.content_replace)))
    const match = truncateMatchedLines(replacedLines)
    const content = match.truncated
      ? `${match.lines.join('\n')}\n……（已截断，共命中 ${match.total} 行）`
      : match.lines.join('\n')
    const renderedTitle = renderDirectTitle(directRule.title_mode as MessageAlertDirectTitleMode, directRule.title_template, msg.title, directRule.name, keywords.join('、'))
    const title = await applyReplacements(renderedTitle, directRule.title_replace)
    enqueueDirectPush(
      channel,
      { title, content },
      { originalTitle: msg.title, ruleName: directRule.name },
    )
  }))
}
