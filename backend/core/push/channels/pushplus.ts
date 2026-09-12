import type { PushplusConfig } from '../config/pushplus'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * 推送加（PushPlus）渠道推送器
 *
 * @param config.token 用户 Token
 */
export default async function pushPushplus(config: PushplusConfig, payload: PushPayload) {
  const body = {
    token: config.token,
    title: payload.title,
    content: payload.content,
    template: 'html',
  }

  const result = await request({
    method: 'POST',
    url: 'https://www.pushplus.plus/send',
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`PushPlus请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, msg?: string } | null
  if (data?.code !== 200) {
    throw new Error(`PushPlus返回业务错误 [${data?.code}] ${data?.msg ?? ''}`.trim())
  }
}
