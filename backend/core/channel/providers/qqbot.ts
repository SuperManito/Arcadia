import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface QQBotConfig extends BaseChannelConfig {
  appId: string
  clientSecret: string
  /** 目标类型（决定端点与 targetId 语义） */
  targetType?: 'group' | 'c2c' | 'channel'
  /** 目标 ID：群聊为 group_openid，单聊为 user_openid，频道为子频道 channel_id */
  targetId: string
}

/**
 * QQ 机器人
 */
export const QQBot = {
  type: 'qqbot',
  configRules: [
    ['appId', [true, 'string']],
    ['clientSecret', [true, 'string']],
    ['targetType', [false, ['group', 'c2c', 'channel']]],
    ['targetId', [true, 'string']],
  ],
  pusher: async (config, payload) => {
    const content = applyTemplate(payload, config.general)
    if (content === null)
      return

    // 凭证错误以 HTTP 200 + 业务码返回，必须校验响应体里的 access_token
    const tokenResult = await request({
      method: 'POST',
      url: 'https://bots.qq.com/app/getAppAccessToken',
      data: { appId: config.appId, clientSecret: config.clientSecret },
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!tokenResult.success) {
      throw new Error(`QQ 机器人获取 access_token 失败：${tokenResult.error ?? '未知错误'}`)
    }
    const tokenData = tokenResult.data as { access_token?: string, code?: number, message?: string } | null
    if (!tokenData?.access_token) {
      throw new Error(`QQ 机器人获取 access_token 失败 [${tokenData?.code}] ${tokenData?.message ?? ''}`.trim())
    }

    // 群/单聊为 v2 接口需显式 msg_type，频道为旧版 guild 接口仅接受 content
    const targetType = config.targetType ?? 'group'
    const url = targetType === 'channel'
      ? `https://api.sgroup.qq.com/channels/${config.targetId}/messages`
      : `https://api.sgroup.qq.com/v2/${targetType === 'group' ? 'groups' : 'users'}/${config.targetId}/messages`
    const body = targetType === 'channel' ? { content } : { msg_type: 0, content }

    const result = await request({
      method: 'POST',
      url,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `QQBot ${tokenData.access_token}`,
        'X-Union-Appid': config.appId,
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`QQ 机器人请求失败：${result.error ?? `HTTP ${result.status ?? '未知状态'}`}`)
    }
  },
} satisfies ChannelDefinition<QQBotConfig>
