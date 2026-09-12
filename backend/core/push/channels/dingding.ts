import type { DingDingConfig } from '../config/dingding'
import type { PushPayload } from '../types'
import { createHmac } from 'node:crypto'
import { request } from '../../../utils/httpUtil'

/**
 * 钉钉渠道推送器
 *
 * @param config.webhookUrl Webhook 地址
 * @param config.secret 加签密钥
 * @param config.mentionType @ 方式
 * @param config.mobiles @ 手机号
 * @param config.users @ 用户 ID
 */
export default async function pushDingDing(config: DingDingConfig, payload: PushPayload) {
  const mentionType = config.mentionType ?? 'none'
  const atMobiles = mentionType === 'mobiles' ? (config.mobiles ?? []) : []
  const atUserIds = mentionType === 'users' ? (config.users ?? []) : []

  // markdown 消息中 @ 手机号需同时出现在正文里才会高亮
  let text = payload.content
  if (atMobiles.length > 0) {
    text += `\n\n${atMobiles.map(mobile => `@${mobile}`).join(' ')}`
  }

  let url = config.webhookUrl
  if (config.secret) {
    const timestamp = Date.now()
    const sign = createHmac('sha256', config.secret).update(`${timestamp}\n${config.secret}`).digest('base64')
    url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
  }

  const body = {
    msgtype: 'markdown',
    markdown: {
      title: payload.title,
      text,
    },
    at: {
      isAtAll: mentionType === 'all',
      atMobiles,
      atUserIds,
    },
  }

  const result = await request({
    method: 'POST',
    url,
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`钉钉请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { errcode?: number, errmsg?: string } | null
  if (data?.errmsg !== 'ok') {
    throw new Error(`钉钉返回业务错误 [${data?.errcode}] ${data?.errmsg ?? ''}`.trim())
  }
}
