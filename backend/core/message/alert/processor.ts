import type { messageModel } from '../../../db'
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

// 一对一规则按命中全局规则按需加载，渠道只取推送需要的字段，避免每条消息全量拉取规则与渠道配置
async function loadHitDirectRules(ruleIds: number[]) {
  return db.messageAlertDirectRule.$list(
    {
      where: {
        enabled: 1,
        messageAlertLinks: { some: { messageAlertRuleId: { in: ruleIds } } },
      },
    },
    {
      include: {
        keywords: {
          where: { enabled: 1 },
          orderBy: { sort: 'asc' },
          include: { channels: { include: { channel: { select: { id: true, name: true, type: true, config: true } } } } },
        },
      },
    },
  )
}

/**
 * 告警处理入口：先求值全局规则，命中后按需加载关联一对一规则，由消息入库路径非阻塞调用；
 * flushFailureSummary 为失败汇总的落库出口（写消息中心），注入以避免队列与会话模块反向依赖消息入库
 */
export async function processMessageAlert(msg: messageModel, flushFailureSummary: (title: string, content: string) => Promise<unknown>) {
  if (!mayMatchRule(msg.category, msg.type)) {
    return
  }
  const rules = await loadEnabledRules()
  // 无渠道且未绑定一对一的规则不会产生任何推送，求值前过滤避免白白占用正则 worker 队列
  const candidateRules = rules.filter(rule => rule.channels.length > 0)
  if (candidateRules.length < rules.length) {
    const boundRuleIds = new Set(
      (await db.messageAlertRuleDirect.findMany({
        where: { messageAlertRuleId: { in: rules.filter(rule => rule.channels.length === 0).map(rule => rule.id) } },
        select: { messageAlertRuleId: true },
      })).map(link => link.messageAlertRuleId),
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
    const hits = await evaluateRules(candidateRules, msg, session)
    if (hits.length === 0) {
      return
    }
    for (const rule of hits) {
      // 全局规则命中后才替换，替换只作用于推送副本；按规则算一次供全部渠道复用
      const pushTitle = await applyReplacements(msg.title, rule.title_replace)
      const pushContent = await applyReplacements(msg.content, rule.content_replace)
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
    // 同一一对一规则可绑定多条命中规则，单条消息只处理一次
    const processedDirectRuleIds = new Set<number>()
    await Promise.allSettled((await loadHitDirectRules(hits.map(rule => rule.id))).map(async (directRule) => {
      if (processedDirectRuleIds.has(directRule.id)) {
        return
      }
      processedDirectRuleIds.add(directRule.id)
      try {
        await processDirectRule(directRule, msg, session)
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
