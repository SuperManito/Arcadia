import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { truncateUtf8 } from '../truncate'

interface WeComBotConfig extends BaseChannelConfig {
  webhookUrl: string
}

/**
 * 企业微信机器人
 */
export const WeComBot = {
  type: 'wecombot',
  singleBody: true,
  configRules: [
    ['webhookUrl', [true, 'string']],
  ],
  rateLimit: {
    // 群机器人 20 条/分钟
    concurrency: 1,
    limits: [
      { count: 20, seconds: 60 },
    ],
  },
  pusher: async (config, payload) => {
    const body = {
      msgtype: 'text',
      text: {
        // text content 官方上限 2048 字节
        content: truncateUtf8(payload.content, 2048),
      },
    }

    const result = await request({
      method: 'POST',
      url: config.webhookUrl,
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`企业微信机器人请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { errcode?: number, errmsg?: string } | null
    if (res?.errcode !== 0) {
      throw new Error(`企业微信机器人返回业务错误 [${res?.errcode}] ${res?.errmsg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<WeComBotConfig>
