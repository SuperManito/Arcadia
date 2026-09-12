import type { WPushConfig } from '../config/wpush'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * WPush 渠道推送器
 *
 * @param config.apiKey API Key
 * @param config.channel 推送通道
 */
export default async function pushWPush(config: WPushConfig, payload: PushPayload) {
  const body = {
    title: payload.title,
    content: payload.content,
    apikey: config.apiKey,
    channel: config.channel,
  }

  const result = await request({
    method: 'POST',
    url: 'https://api.wpush.cn/api/v1/send',
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`WPush请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, message?: string } | null
  if (data?.code !== 0) {
    throw new Error(`WPush返回业务错误 [${data?.code}] ${data?.message ?? ''}`.trim())
  }
}
