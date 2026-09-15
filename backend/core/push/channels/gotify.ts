import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface GotifyConfig extends BaseChannelConfig {
  serverUrl: string
  token: string
  /** 消息优先级 */
  priority?: number
}

/**
 * Gotify
 */
export const Gotify = {
  type: 'gotify',
  configRules: [
    ['serverUrl', [true, 'string']],
    ['token', [true, 'string']],
    ['priority', [false, 'number']],
  ],
  pusher: async (config, payload) => {
    const serverUrl = config.serverUrl.replace(/\/+$/, '')
    const body = {
      title: payload.title,
      message: payload.content,
      priority: config.priority ?? 8,
    }

    const result = await request({
      method: 'POST',
      url: `${serverUrl}/message`,
      params: { token: config.token },
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Gotify请求失败：${result.error ?? '未知错误'}`)
    }
  },
} satisfies ChannelDefinition<GotifyConfig>
