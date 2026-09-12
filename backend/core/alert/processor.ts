import type { messageModel } from '../../db'
import { db } from '../../db'
import { logger } from '../../utils/logger'
import { matchRule } from './matcher'
import { dispatch } from '../push'
import { sendMessage } from '../message'

export async function processMessageAlert(msg: messageModel) {
  const rules = await db.alertRule.findMany({
    where: { scope: 'message', enabled: 1 },
    include: {
      conditions: { orderBy: { sort: 'asc' } },
      channels: { orderBy: { sort: 'asc' }, include: { alertChannel: true } },
    },
  })

  for (const rule of rules) {
    const hit = matchRule(
      { title: msg.title, content: msg.content, category: msg.category, type: msg.type },
      {
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
      },
    )
    if (!hit) {
      continue
    }
    logger.info('[监控告警] 规则命中', {
      ruleId: rule.id,
      ruleName: rule.name,
      messageId: msg.id,
      messageTitle: msg.title,
      channelCount: rule.channels.length,
    })
    for (const link of rule.channels) {
      try {
        await dispatch(
          { type: link.alertChannel.type, config: link.alertChannel.config },
          { title: msg.title, content: msg.content },
        )
      }
      catch (e: any) {
        logger.error('[监控告警] 渠道发送失败', {
          ruleId: rule.id,
          ruleName: rule.name,
          channelId: link.alertChannel.id,
          channelName: link.alertChannel.name,
          channelType: link.alertChannel.type,
          error: e?.message ?? e,
        })
        void sendMessage({
          title: '监控告警推送失败',
          content: `规则：${rule.name}\n渠道：${link.alertChannel.name}（${link.alertChannel.type}）\n错误：${e?.message ?? '未知错误'}`,
          category: 'system',
          type: 'error',
          skipAlert: true,
        }).catch(() => {})
      }
    }
  }
}
