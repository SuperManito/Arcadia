import type { messageModel } from '../../../db'
import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import {
  evaluateConditions,
  parseMultiValue,
} from '../../alert/matcher'
import { MessageCategory, MessageType } from '../../type/message'
import { pushChannel } from '../../channel'
import { sendMessage } from '../index'
import type { MessageAlertContext, MessageAlertRuleInput } from './types'

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
export function evaluateMessageAlertRule(msg: MessageAlertContext, rule: MessageAlertRuleInput):
{
  matched: boolean
  conditions: Array<{ sort: number, matched: boolean }>
} {
  const conditionResult = evaluateConditions({
    title: msg.title,
    content: msg.content,
  }, rule.logic, rule.conditions)
  return {
    matched: matchMessageAlertFilters(msg, rule) && conditionResult.matched,
    conditions: conditionResult.conditions,
  }
}

/**
 * 规则是否命中：分类 / 级别范围过滤与条件组求值的综合结果
 */
export function matchMessageAlertRule(
  msg: MessageAlertContext,
  rule: MessageAlertRuleInput,
): boolean {
  return evaluateMessageAlertRule(msg, rule).matched
}

/**
 * 查询全部启用规则，连同匹配条件与关联渠道配置
 */
async function loadEnabledRules() {
  return db.messageAlertRule.findMany({
    where: { enabled: 1 },
    include: {
      conditions: { orderBy: { sort: 'asc' } },
      channels: { include: { channel: true } },
    },
  })
}

// 是否可能存在启用规则的内存标记：false 时跳过查询。规则增删改路径经 refreshHasEnabledRules 刷新；初值 true 由首次加载自行校正，避免重启后已有规则被漏判
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
  hasEnabledRules = rules.length > 0

  const context = { title: msg.title, content: msg.content, category: msg.category, type: msg.type }
  await Promise.allSettled(rules.map(rule => processRule(rule, msg, context)))
}

// allSettled 保证单规则 / 单渠道失败不影响其余
async function processRule(
  rule: Awaited<ReturnType<typeof loadEnabledRules>>[number],
  msg: messageModel,
  context: MessageAlertContext,
) {
  const hit = matchMessageAlertRule(context, {
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
}
