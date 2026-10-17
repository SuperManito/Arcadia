import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { TEMPLATE_CONTENT_PLACEHOLDER, TEMPLATE_TITLE_PLACEHOLDER } from '../constants'

const BODY_PLACEHOLDER_PATTERN = new RegExp(
  `\\{\\{(?:${[TEMPLATE_TITLE_PLACEHOLDER, TEMPLATE_CONTENT_PLACEHOLDER].map(name => name.slice(2, -2)).join('|')})\\}\\}`,
  'g',
)

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
      for (const [key, value] of Object.entries(parseHeaders(config.headers))) {
        const lowerKey = key.toLowerCase()
        for (const existing of Object.keys(headers)) {
          if (existing.toLowerCase() === lowerKey)
            delete headers[existing]
        }
        headers[key] = value
      }
    }

    const escapeValue = (text: string) => contentType === 'form'
      ? encodeURIComponent(text)
      : JSON.stringify(text).slice(1, -1)
    // 单遍替换，标题/内容值中的字面量占位符不会被二次展开
    const renderBody = (text: string) => text.replace(BODY_PLACEHOLDER_PATTERN, matched =>
      matched === TEMPLATE_TITLE_PLACEHOLDER ? escapeValue(payload.title) : escapeValue(payload.content))
    const body: object | string = config.body?.trim()
      ? renderBody(config.body)
      : { title: payload.title, content: payload.content }

    const result = await request({
      method,
      url: config.url,
      ...(method === 'GET' ? {} : { data: body }),
      headers,
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Webhook 请求失败：${result.error ?? `HTTP ${result.status ?? '未知状态'}`}`)
    }
  },
} satisfies ChannelDefinition<WebhookConfig>
