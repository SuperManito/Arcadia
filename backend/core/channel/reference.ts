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
  const alertRuleCount = await db.messageAlertRuleChannel.count({
    where: { channelId },
  })
  // 收信人-渠道关联按收信人去重到规则，渠道被同规则多个收信人绑定时只计一条；
  // 计数在库端完成，避免把全量关联行连收信人对象拉回内存
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT r."directRuleId") AS count
    FROM "messageAlertDirectRuleReceiverChannel" c
    JOIN "messageAlertDirectRuleReceiver" r ON r."id" = c."receiverId"
    WHERE c."channelId" = ${channelId}`
  const directRuleCount = Number(rows[0]?.count ?? 0)
  const taskCount = await countTasksByAlertChannel(channelId)
  return { alertRuleCount, directRuleCount, taskCount }
}
