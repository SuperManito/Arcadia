import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface TelegramConfig extends BaseChannelConfig {
  botToken: string
  chatId: string
  /** 话题 ID */
  messageThreadId?: string
  /** 自定义 API 服务地址 */
  serverUrl?: string
  /** 静默发送 */
  sendSilently?: boolean
  /** 保护内容 */
  protectContent?: boolean
}

/**
 * Telegram
 */
export const Telegram = {
  type: 'telegram',
  configRules: [
    ['botToken', [true, 'string']],
    ['chatId', [true, 'string']],
    ['messageThreadId', [false, 'string']],
    ['serverUrl', [false, 'string']],
    ['sendSilently', [false, 'boolean']],
    ['protectContent', [false, 'boolean']],
  ],
  pusher: async (config, payload) => {
    const serverUrl = (config.serverUrl || 'https://api.telegram.org').replace(/\/+$/, '')

    const text = applyTemplate(payload, config.general)
    if (text === null) {
      return
    }
    const body: Record<string, unknown> = {
      chat_id: config.chatId,
      text,
      link_preview_options: { is_disabled: true },
    }
    if (config.sendSilently) {
      body.disable_notification = true
    }
    if (config.protectContent) {
      body.protect_content = true
    }
    if (config.messageThreadId) {
      body.message_thread_id = Number(config.messageThreadId)
    }

    const result = await request({
      method: 'POST',
      url: `${serverUrl}/bot${config.botToken}/sendMessage`,
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Telegram请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { ok?: boolean, description?: string } | null
    if (res?.ok !== true) {
      throw new Error(`Telegram返回业务错误 ${res?.description ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<TelegramConfig>
