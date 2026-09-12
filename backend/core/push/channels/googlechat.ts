import type { GoogleChatConfig } from '../config/googlechat'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Google Chat 渠道推送器
 *
 * @param config.webhookUrl Webhook 地址
 * @param config.maxRetries 最大重试次数
 */
export default async function pushGoogleChat(config: GoogleChatConfig, payload: PushPayload) {
  // 无独立标题字段，标题并入正文开头
  const body = {
    text: `${payload.title}\n${payload.content}`,
  }

  const maxRetries = config.maxRetries ?? 1
  let attempt = 0
  // 429 限流时短间隔重试，避免长时间阻塞告警派发
  let result = await request({
    method: 'POST',
    url: config.webhookUrl,
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  while (result.status === 429 && attempt < maxRetries) {
    attempt++
    await new Promise(resolve => setTimeout(resolve, 1000))
    result = await request({
      method: 'POST',
      url: config.webhookUrl,
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  if (!result.success) {
    throw new Error(`Google Chat请求失败：${result.error ?? '未知错误'}`)
  }
}
