import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface KookConfig extends BaseChannelConfig {
  botToken: string
  guildId: string
}

/**
 * Kook
 */
export const Kook = {
  type: 'kook',
  configRules: [
    ['botToken', [true, 'string']],
    ['guildId', [true, 'string']],
  ],
  pusher: async (config, payload) => {
    const content = applyTemplate(payload, config.general)
    if (content === null)
      return
    const body = {
      target_id: config.guildId,
      content,
    }

    const result = await request({
      method: 'POST',
      url: 'https://www.kookapp.cn/api/v3/message/create',
      data: body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${config.botToken}`,
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Kook请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, message?: string } | null
    if (res?.code !== 0) {
      throw new Error(`Kook返回业务错误 [${res?.code}] ${res?.message ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<KookConfig>
