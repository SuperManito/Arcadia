import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface PushplusConfig extends BaseChannelConfig {
  token: string
}

/**
 * 推送加（pushplus）
 */
export const Pushplus = {
  type: 'pushplus',
  configRules: [
    ['token', [true, 'string']],
  ],
  pusher: async (config, payload) => {
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
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`PushPlus请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, msg?: string } | null
    if (res?.code !== 200) {
      throw new Error(`PushPlus返回业务错误 [${res?.code}] ${res?.msg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<PushplusConfig>
