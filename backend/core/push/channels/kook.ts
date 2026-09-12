import type { KookConfig } from '../config/kook'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Kook 渠道推送器
 *
 * @param config.botToken 机器人 Token
 * @param config.guildId 目标频道 ID
 */
export default async function pushKook(config: KookConfig, payload: PushPayload) {
  // 无独立标题字段，标题并入正文开头
  const body = {
    target_id: config.guildId,
    content: `${payload.title}\n${payload.content}`,
  }

  const result = await request({
    method: 'POST',
    url: 'https://www.kookapp.cn/api/v3/message/create',
    data: body,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${config.botToken}`,
    },
  })
  if (!result.success) {
    throw new Error(`Kook请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, message?: string } | null
  if (data?.code !== 0) {
    throw new Error(`Kook返回业务错误 [${data?.code}] ${data?.message ?? ''}`.trim())
  }
}
