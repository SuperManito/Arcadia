import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface GoogleChatConfig extends BaseChannelConfig {
  webhookUrl: string
  /** 最大重试次数 */
  maxRetries?: number
}

/**
 * Google Chat
 */
export const GoogleChat = {
  type: 'googlechat',
  configRules: [
    ['webhookUrl', [true, 'string']],
    ['maxRetries', [false, 'number']],
  ],
  pusher: async (config, payload) => {
    const text = applyTemplate(payload, config.general)
    if (text === null) {
      return
    }
    const body = {
      text,
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
      proxy: config.general?.proxy,
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
        proxy: config.general?.proxy,
      })
    }
    if (!result.success) {
      throw new Error(`Google Chat请求失败：${result.error ?? '未知错误'}`)
    }
  },
} satisfies ChannelDefinition<GoogleChatConfig>
