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
  // 收信人-渠道关联按收信人去重到规则，渠道被同规则多个收信人绑定时只计一条
  const directReceiverLinks = await db.messageAlertDirectRuleReceiverChannel.$list(
    { where: { channelId } },
    { include: { receiver: { select: { directRuleId: true } } } },
  )
  const directRuleCount = new Set(directReceiverLinks.map(link => link.receiver.directRuleId)).size
  const taskCount = await countTasksByAlertChannel(channelId)
  return { alertRuleCount, directRuleCount, taskCount }
}
