import db from '../../db'
import { countTasksByAlertChannel } from '../cron/query'

/**
 * 渠道被业务引用的计数：删除前的占用检查出口，引用文案由调用方拼装
 */
export async function getChannelReferences(channelId: number): Promise<{
  alertRuleCount: number
  directRuleCount: number
  taskCount: number
}> {
  const alertRuleCount = await db.messageAlertRuleChannel.count({ where: { channelId } })
  // 关键字-渠道关联按关键字去重到规则，渠道被同规则多个关键字绑定时只计一条
  const directKeywordLinks = await db.messageAlertDirectRuleKeywordChannel.$list(
    { where: { channelId } },
    { include: { keyword: { select: { messageAlertDirectRuleId: true } } } },
  )
  const directRuleCount = new Set(directKeywordLinks.map(link => link.keyword.messageAlertDirectRuleId)).size
  const taskCount = await countTasksByAlertChannel(channelId)
  return { alertRuleCount, directRuleCount, taskCount }
}
