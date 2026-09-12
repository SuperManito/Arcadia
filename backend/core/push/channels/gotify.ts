import type { GotifyConfig } from '../config/gotify'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Gotify 渠道推送器
 *
 * @param config.serverUrl 服务器地址
 * @param config.token 应用 Token
 * @param config.priority 消息优先级
 */
export default async function pushGotify(config: GotifyConfig, payload: PushPayload) {
  const serverUrl = config.serverUrl.replace(/\/+$/, '')
  const body = {
    title: payload.title,
    message: payload.content,
    priority: config.priority ?? 8,
  }

  const result = await request({
    method: 'POST',
    url: `${serverUrl}/message?token=${encodeURIComponent(config.token)}`,
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`Gotify请求失败：${result.error ?? '未知错误'}`)
  }
}
