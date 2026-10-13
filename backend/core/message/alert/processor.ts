import type { messageModel } from '../../../db'
import type { ChannelSnapshot } from './direct/dispatch'
import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import { applyReplacements } from '../../alert'
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

// 一对一规则按命中全局规则按需加载，收信人只取渠道 ID，渠道配置对去重后的 ID 统一查一次
async function loadHitDirectRules(ruleIds: number[]) {
  const rules = await db.messageAlertDirectRule.$list(
    {
      where: {
        enabled: 1,
        bindings: { some: { alertRuleId: { in: ruleIds } } },
      },
    },
    {
      include: {
        keywords: {
          where: { enabled: 1 },
          orderBy: { sort: 'asc' },
          include: { channels: { select: { channelId: true } } },
        },
      },
    },
  )
  const channelIds = [...new Set(rules.flatMap(rule => rule.keywords.flatMap(keyword => keyword.channels.map(link => link.channelId))))]
  const channels = channelIds.length > 0
    ? await db.notificationChannel.$list(
        { where: { id: { in: channelIds } } },
        { select: { id: true, name: true, type: true, config: true } },
      )
    : []
  const channelsById = new Map<number, ChannelSnapshot>(channels.map(channel => [channel.id, channel]))
  return {
    directRules: rules.map(({ keywords, ...rest }) => ({
      ...rest,
      keywords: keywords.map(({ channels: links, ...keyword }) => ({
        ...keyword,
        channelIds: links.map(link => link.channelId),
      })),
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
      const pushTitle = await applyReplacements(alertMessage.title, rule.title_replace)
      const pushContent = await applyReplacements(alertMessage.content, rule.content_replace)
      // 全局消息队头插入优先发送，失败随会话聚合上报
      for (const link of rule.channels) {
        enqueuePush(
          link.channel,
          { title: pushTitle, content: pushContent },
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
        logger.error('[消息中心监控告警] 一对一规则处理异常', {
          directRuleId: directRule.id,
          directRuleName: directRule.name,
          error: e?.message,
        })
      }
    }))
  }
  finally {
    closeSession(session)
  }
}
