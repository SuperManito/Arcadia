import type { messageModel } from '../../../db'
import type { MessageAlertContext, MessageAlertRuleInput } from './types'
import type { MessageAlertDirectTitleMode } from './direct/types'
import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import {
  evaluateConditions,
  parseMultiValue,
} from '../../alert/matcher'
import { MessageCategory, MessageType } from '../../type/message'
import { pushChannel } from '../../channel'
import { sendMessage } from '../index'
import { extractMatchedLines } from './direct/extract'
import { enqueueDirectPush } from './direct/directQueue'
import { evaluateDirectConditions, renderDirectTitle } from './direct/evaluate'

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

/**
 * 规则是否命中：分类 / 级别范围过滤与条件组求值的综合结果
 */
export async function matchMessageAlertRule(
  msg: MessageAlertContext,
  rule: MessageAlertRuleInput,
): Promise<boolean> {
  return (await evaluateMessageAlertRule(msg, rule)).matched
}

/**
 * 查询全部启用规则，连同匹配条件、关联渠道与挂载的一对一规则
 */
async function loadEnabledRules() {
  return db.messageAlertRule.$list(
    { where: { enabled: 1 } },
    {
      include: {
        conditions: { orderBy: { sort: 'asc' } },
        channels: { include: { channel: true } },
        directs: {
          include: {
            directRule: {
              include: {
                conditions: { orderBy: { sort: 'asc' } },
                channels: { include: { channel: true } },
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
 * 规则增删改后刷新启用标记（一次启用计数查询）
 */
export async function refreshHasEnabledRules() {
  hasEnabledRules = (await db.messageAlertRule.count({ where: { enabled: 1 } })) > 0
}

/**
 * 告警处理入口：命中规则与关联渠道两级并发推送，由消息入库路径非阻塞调用
 */
export async function processMessageAlert(msg: messageModel) {
  if (!hasEnabledRules) {
    return
  }
  const rules = await loadEnabledRules()

  const context = { title: msg.title, content: msg.content, category: msg.category, type: msg.type }
  await Promise.all(rules.map(async (rule) => {
    try {
      await processRule(rule, msg, context)
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
) {
  // 空渠道且无挂载一对一规则直接跳过
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
  await Promise.allSettled(rule.channels.map(async (link) => {
    const result = await pushChannel(
      { type: link.channel.type, config: link.channel.config },
      { title: msg.title, content: msg.content },
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

  await Promise.allSettled(rule.directs.map(async (link) => {
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

// 提取空 = 无推送（提取正则未命中或执行超时按无提取处理）
async function processDirectRule(
  directRule: Awaited<ReturnType<typeof loadEnabledRules>>[number]['directs'][number]['directRule'],
  msg: messageModel,
) {
  if (directRule.channels.length === 0) {
    return
  }
  const evaluation = await evaluateDirectConditions(
    { title: msg.title, content: msg.content },
    {
      logic: directRule.logic,
      conditions: directRule.conditions.map(condition => ({
        mode: condition.mode,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        sort: condition.sort,
        enabled: condition.enabled,
      })),
    },
  )
  if (!evaluation.matched) {
    return
  }
  const extract = await extractMatchedLines(directRule.extract_regex, msg.content)
  if (extract === null || extract.lines.length === 0) {
    return
  }
  const content = extract.truncated
    ? `${extract.lines.join('\n')}\n……（已截断，共命中 ${extract.total} 行）`
    : extract.lines.join('\n')
  const title = renderDirectTitle(directRule.title_mode as MessageAlertDirectTitleMode, directRule.title_template, msg.title, directRule.name)
  for (const link of directRule.channels) {
    enqueueDirectPush(
      link.channel,
      { title, content },
      { originalTitle: msg.title, ruleName: directRule.name },
    )
  }
}
