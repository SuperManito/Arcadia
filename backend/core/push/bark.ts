import type { BarkConfig, PushPayload } from './types'
import { request } from '../../utils/httpUtil'

/**
 * Bark 渠道推送器
 *
 * @param config.deviceKey 设备 Key
 * @param config.server 自建服务地址（可选）
 * @param config.url 跳转URL（可选）
 */
export default async function pushBark(config: BarkConfig, payload: PushPayload) {
  const body: Record<string, unknown> = {
    title: payload.title,
    body: payload.content,
    device_key: config.deviceKey,
  }
  if (config.url) {
    body.url = config.url
  }

  const server = (config.server || 'https://api.day.app').replace(/\/+$/, '')
  const result = await request({
    method: 'POST',
    url: `${server}/push`,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
  if (!result.success) {
    throw new Error(`Bark 请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, message?: string } | null
  if (data?.code !== 200) {
    throw new Error(`Bark 返回业务错误 [${data?.code}] ${data?.message ?? ''}`.trim())
  }
}
