import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { createHmac } from 'node:crypto'
import { request } from '../../../utils/httpUtil'

interface DingDingConfig extends BaseChannelConfig {
  webhookUrl: string
  /** 加签密钥 */
  secret?: string
  /** @ 方式 */
  mentionType?: 'none' | 'all' | 'mobiles' | 'users'
  /** @ 手机号 */
  mobiles?: string[]
  /** @ 用户 ID */
  users?: string[]
}

/**
 * 钉钉
 */
export const DingDing = {
  type: 'dingding',
  configRules: [
    ['webhookUrl', [true, 'string']],
    ['secret', [false, 'string']],
    ['mentionType', [false, ['none', 'all', 'mobiles', 'users']]],
    ['mobiles', [false, 'string[]']],
    ['users', [false, 'string[]']],
  ],
  pusher: async (config, payload) => {
    const mentionType = config.mentionType ?? 'none'
    const atMobiles = mentionType === 'mobiles' ? (config.mobiles ?? []) : []
    const atUserIds = mentionType === 'users' ? (config.users ?? []) : []

    // markdown 消息中 @ 手机号需同时出现在正文里才会高亮
    let text = payload.content
    if (atMobiles.length > 0) {
      text += `\n\n${atMobiles.map(mobile => `@${mobile}`).join(' ')}`
    }

    const params: Record<string, string | number> = {}
    if (config.secret) {
      const timestamp = Date.now()
      const sign = createHmac('sha256', config.secret).update(`${timestamp}\n${config.secret}`).digest('base64')
      params.timestamp = timestamp
      params.sign = sign
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
      url: config.webhookUrl,
      params,
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`钉钉请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { errcode?: number, errmsg?: string } | null
    if (res?.errmsg !== 'ok') {
      throw new Error(`钉钉返回业务错误 [${res?.errcode}] ${res?.errmsg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<DingDingConfig>
