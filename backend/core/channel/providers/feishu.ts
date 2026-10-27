import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface FeishuConfig extends BaseChannelConfig {
  webhookUrl: string
}

/**
 * 飞书
 */
export const Feishu = {
  type: 'feishu',
  singleBody: true,
  configRules: [
    [
      'webhookUrl',
      [true, 'string'],
    ],
  ],
  rateLimit: {
    // 官方双层限制：5 次/秒 + 100 次/分钟
    concurrency: 1,
    limits: [
      { count: 5, seconds: 1 },
      { count: 100, seconds: 60 },
    ],
  },
  pusher: async (config, payload) => {
    const body = {
      msg_type: 'text',
      content: {
        text: payload.content,
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
      throw new Error(`飞书请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, StatusCode?: number, msg?: string } | null
    if (res?.code !== 0 && res?.StatusCode !== 0) {
      throw new Error(`飞书返回业务错误 [${res?.code ?? res?.StatusCode}] ${res?.msg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<FeishuConfig>
