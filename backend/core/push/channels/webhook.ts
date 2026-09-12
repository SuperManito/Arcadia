import type { WebhookConfig } from '../config/webhook'
import type { PushPayload } from '../types'
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
 * 通用 Webhook 渠道推送器
 *
 * @param config.url Webhook 地址
 * @param config.method 请求方法
 * @param config.contentType 内容类型
 * @param config.headers 自定义请求头
 * @param config.body 请求体模板
 */
export default async function pushWebhook(config: WebhookConfig, payload: PushPayload) {
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
  })
  if (!result.success) {
    throw new Error(`Webhook 请求失败：${result.error ?? `HTTP ${result.status ?? '未知状态'}`}`)
  }
}
