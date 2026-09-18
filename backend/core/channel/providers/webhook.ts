import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

/** 解析 JSON 文本请求头 */
function parseHeaders(raw: string): Record<string, string> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    throw new Error('自定义请求头不是合法的 JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('自定义请求头必须是 JSON 对象，如 { "Authorization": "Bearer xxx" }')
  }
  return parsed as Record<string, string>
}

/**
 * 通用 Webhook
 */
interface WebhookConfig extends BaseChannelConfig {
  url: string
  /** 请求方法 */
  method?: 'POST' | 'GET' | 'PUT'
  /** 内容类型 */
  contentType?: 'json' | 'form'
  /** 自定义请求头 */
  headers?: string
  /** 请求体模板 */
  body?: string
}

export const Webhook = {
  type: 'webhook',
  configRules: [
    ['url', [true, 'string']],
    ['method', [false, ['POST', 'GET', 'PUT']]],
    ['contentType', [false, ['json', 'form']]],
    ['headers', [false, 'string']],
    ['body', [false, 'string']],
  ],
  pusher: async (config, payload) => {
    const method = config.method ?? 'POST'
    const contentType = config.contentType ?? 'json'

    const headers: Record<string, string> = {
      'Content-Type': contentType === 'form' ? 'application/x-www-form-urlencoded' : 'application/json',
    }
    if (config.headers?.trim()) {
      Object.assign(headers, parseHeaders(config.headers))
    }

    // 用 split/join 而非 replace 替换占位符，避免内容中的 $& 等被当作替换模式解释
    const body: object | string = config.body?.trim()
      ? config.body.split('{{title}}').join(payload.title).split('{{content}}').join(payload.content)
      : { title: payload.title, content: payload.content }

    const result = await request({
      method,
      url: config.url,
      data: body,
      headers,
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Webhook 请求失败：${result.error ?? `HTTP ${result.status ?? '未知状态'}`}`)
    }
  },
} satisfies ChannelDefinition<WebhookConfig>
