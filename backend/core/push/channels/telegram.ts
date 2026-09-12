import type { TelegramConfig } from '../config/telegram'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Telegram 渠道推送器
 *
 * @param config.botToken Bot Token
 * @param config.chatId Chat ID
 * @param config.messageThreadId 话题 ID
 * @param config.serverUrl 自定义 API 服务地址
 * @param config.sendSilently 静默发送
 * @param config.protectContent 保护内容
 */
export default async function pushTelegram(config: TelegramConfig, payload: PushPayload) {
  const serverUrl = (config.serverUrl || 'https://api.telegram.org').replace(/\/+$/, '')

  // 无独立标题字段，标题并入正文开头
  const body: Record<string, unknown> = {
    chat_id: config.chatId,
    text: `${payload.title}\n${payload.content}`,
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
  })
  if (!result.success) {
    throw new Error(`Telegram请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { ok?: boolean, description?: string } | null
  if (data?.ok !== true) {
    throw new Error(`Telegram返回业务错误 ${data?.description ?? ''}`.trim())
  }
}
