import type { WeComBotConfig } from '../config/wecombot'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * 企业微信机器人渠道推送器
 *
 * @param config.webhookUrl Webhook 地址
 */
export default async function pushWeComBot(config: WeComBotConfig, payload: PushPayload) {
  // 无独立标题字段，标题并入正文开头
  const body = {
    msgtype: 'text',
    text: {
      content: `${payload.title}\n\n${payload.content}`,
    },
  }

  const result = await request({
    method: 'POST',
    url: config.webhookUrl,
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`企业微信机器人请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { errcode?: number, errmsg?: string } | null
  if (data?.errcode !== 0) {
    throw new Error(`企业微信机器人返回业务错误 [${data?.errcode}] ${data?.errmsg ?? ''}`.trim())
  }
}
