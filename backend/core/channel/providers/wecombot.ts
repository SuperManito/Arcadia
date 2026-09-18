import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface WeComBotConfig extends BaseChannelConfig {
  webhookUrl: string
}

/**
 * 企业微信机器人
 */
export const WeComBot = {
  type: 'wecombot',
  configRules: [
    ['webhookUrl', [true, 'string']],
  ],
  pusher: async (config, payload) => {
    const content = applyTemplate(payload, config.general)
    if (content === null)
      return
    const body = {
      msgtype: 'text',
      text: {
        content,
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
