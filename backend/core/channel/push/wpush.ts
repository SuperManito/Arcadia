import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface WPushConfig extends BaseChannelConfig {
  apiKey: string
  channel: 'wechat' | 'sms' | 'mail' | 'feishu' | 'dingtalk' | 'wechat_work'
}

/**
 * WPush
 */
export const WPush = {
  type: 'wpush',
  configRules: [
    ['apiKey', [true, 'string']],
    ['channel', [true, ['wechat', 'sms', 'mail', 'feishu', 'dingtalk', 'wechat_work']]],
  ],
  pusher: async (config, payload) => {
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
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`WPush请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, message?: string } | null
    if (res?.code !== 0) {
      throw new Error(`WPush返回业务错误 [${res?.code}] ${res?.message ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<WPushConfig>
