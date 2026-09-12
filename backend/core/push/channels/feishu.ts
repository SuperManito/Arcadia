import type { FeishuConfig } from '../config/feishu'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * 飞书渠道推送器
 *
 * @param config.webhookUrl Webhook 地址
 */
export default async function pushFeishu(config: FeishuConfig, payload: PushPayload) {
  // 无独立标题字段，标题并入正文开头
  const body = {
    msg_type: 'text',
    content: {
      text: `${payload.title}\n${payload.content}`,
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
    throw new Error(`飞书请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, StatusCode?: number, msg?: string } | null
  if (data?.code !== 0 && data?.StatusCode !== 0) {
    throw new Error(`飞书返回业务错误 [${data?.code ?? data?.StatusCode}] ${data?.msg ?? ''}`.trim())
  }
}
