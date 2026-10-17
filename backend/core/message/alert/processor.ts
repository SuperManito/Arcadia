import type { messageModel } from '../../../db'
import type { ChannelSnapshot } from './direct/dispatch'
import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import { applyReplacements } from '../../alert'
import { isTitlelessChannel } from '../../channel'
import { evaluateRules } from './evaluate'
import { enqueuePush } from './pushQueue'
import { closeSession, createPushSession } from './pushSession'
import { mayMatchRule } from './ruleIndex'
import { processDirectRule } from './direct/dispatch'

async function loadEnabledRules() {
  return db.messageAlertRule.$list(
    { where: { enabled: 1 } },
    {
      include: {
        conditions: { orderBy: { sort: 'asc' } },
        channels: { include: { channel: true } },
      },
    },
  )
}

// 一对一规则按命中全局规则按需加载：规则体、启用收信人、渠道关联各一条扁平查询后内存分组，
// 渠道关联按 receiver 的 directRuleId 反向过滤（不走 IN (收信人 id 列表)），收信人万级时不触碰 SQLite 变量上限
async function loadHitDirectRules(ruleIds: number[]) {
  const rules = await db.messageAlertDirectRule.$list(
    {
      where: {
        enabled: 1,
        bindings: { some: { alertRuleId: { in: ruleIds } } },
      },
    },
    {
      select: { id: true, name: true, title_mode: true, title_template: true, title_merge: true, channel_merge: true, pre_replaces: true, post_replaces: true, common_pattern: true },
    },
  )
  if (rules.length === 0) {
    return { directRules: [], channelsById: new Map<number, ChannelSnapshot>() }
  }
  const hitRuleIds = rules.map(rule => rule.id)
  const [receivers, links] = await Promise.all([
    db.messageAlertDirectRuleReceiver.$list(
      { where: { directRuleId: { in: hitRuleIds }, enabled: 1 }, orderBy: { id: 'asc' } },
      { select: { id: true, directRuleId: true, receiver: true, overrides: true } },
    ),
    db.messageAlertDirectRuleReceiverChannel.$list(
      { where: { receiver: { directRuleId: { in: hitRuleIds } } } },
      { select: { receiverId: true, channelId: true } },
    ),
  ])
  const enabledReceiverIds = new Set(receivers.map(receiver => receiver.id))
  const channelIdsByReceiver = new Map<number, number[]>()
  const allChannelIds = new Set<number>()
  for (const link of links) {
    // 禁用收信人不加载，其渠道关联一并跳过
    if (!enabledReceiverIds.has(link.receiverId)) {
      continue
    }
    const ids = channelIdsByReceiver.get(link.receiverId)
    if (ids) {
      ids.push(link.channelId)
    }
    else {
      channelIdsByReceiver.set(link.receiverId, [link.channelId])
    }
    allChannelIds.add(link.channelId)
  }
  const channels = allChannelIds.size > 0
    ? await db.notificationChannel.$list(
        { where: { id: { in: [...allChannelIds] } } },
        { select: { id: true, name: true, type: true, config: true } },
      )
    : []
  const channelsById = new Map<number, ChannelSnapshot>(channels.map(channel => [channel.id, channel]))
  const receiversByRule = new Map<number, Array<{ receiver: string, overrides: string, channelIds: number[] }>>()
  for (const { id, directRuleId, receiver, overrides } of receivers) {
    const list = receiversByRule.get(directRuleId)
    const entry = { receiver, overrides, channelIds: channelIdsByReceiver.get(id) ?? [] }
    if (list) {
      list.push(entry)
    }
    else {
      receiversByRule.set(directRuleId, [entry])
    }
  }
  return {
    directRules: rules.map(rule => ({
      ...rule,
      receivers: receiversByRule.get(rule.id) ?? [],
    })),
    channelsById,
  }
}

/**
 * 告警处理入口：先求值全局规则，命中后按需加载关联一对一规则，由消息入库路径非阻塞调用；
 * rawContent 为入库截断前的完整正文，告警匹配与推送使用原文避免超长名单尾部静默丢失；
 * flushFailureSummary 为失败汇总的落库出口（写消息中心），注入以避免队列与会话模块反向依赖消息入库
 */
export async function processMessageAlert(
  msg: messageModel,
  rawContent: string,
  flushFailureSummary: (title: string, content: string) => Promise<unknown>,
) {
  if (!mayMatchRule(msg.category, msg.type)) {
    return
  }
  const alertMessage = { title: msg.title, content: rawContent, category: msg.category, type: msg.type }
  const rules = await loadEnabledRules()
  // 无渠道且未绑定一对一的规则不会产生任何推送，求值前过滤避免白白占用正则 worker 队列
  const candidateRules = rules.filter(rule => rule.channels.length > 0)
  if (candidateRules.length < rules.length) {
    const boundRuleIds = new Set(
      (await db.messageAlertDirectRuleBinding.findMany({
        where: { alertRuleId: { in: rules.filter(rule => rule.channels.length === 0).map(rule => rule.id) } },
        select: { alertRuleId: true },
      })).map(link => link.alertRuleId),
    )
    for (const rule of rules) {
      if (rule.channels.length === 0 && boundRuleIds.has(rule.id)) {
        candidateRules.push(rule)
      }
    }
  }
  if (candidateRules.length === 0) {
    return
  }
  const session = createPushSession(msg.title, flushFailureSummary)
  try {
    const hits = await evaluateRules(candidateRules, alertMessage, session)
    if (hits.length === 0) {
      return
    }
    for (const rule of hits) {
      // 全局规则命中后才替换，替换只作用于推送副本；按规则算一次供全部渠道复用
      const pushTitle = await applyReplacements(alertMessage.title, rule.replaces, 'title')
      const pushContent = await applyReplacements(alertMessage.content, rule.replaces, 'content')
      // 全局消息队头插入优先发送，失败随会话聚合上报
      for (const link of rule.channels) {
        // 置空串交由推送层清理拼接残留
        const title = rule.title_merge === 0 && isTitlelessChannel(link.channel.type) ? '' : pushTitle
        enqueuePush(
          link.channel,
          { title, content: pushContent },
          { ruleName: rule.name },
          session,
          true,
        )
      }
    }
    const { directRules, channelsById } = await loadHitDirectRules(hits.map(rule => rule.id))
    await Promise.allSettled(directRules.map(async (directRule) => {
      try {
        await processDirectRule(directRule, channelsById, alertMessage, session)
      }
      catch (e: any) {
        logger.error('[消息中心监控告警] 一对一规则处理异常', JSON.stringify({ directRuleId: directRule.id, directRuleName: directRule.name }), e)
      }
    }))
  }
  finally {
    closeSession(session)
  }
}
