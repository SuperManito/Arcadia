import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface WeComAppConfig extends BaseChannelConfig {
  corpId: string
  corpSecret: string
  agentId: number
  /** 接收成员 */
  toUser: string[]
}

/**
 * 企业微信应用
 */
export const WeComApp = {
  type: 'wecomapp',
  configRules: [
    ['corpId', [true, 'string']],
    ['corpSecret', [true, 'string']],
    ['agentId', [true, 'number']],
    ['toUser', [true, 'string[]']],
  ],
  pusher: async (config, payload) => {
    // 先判空再取 token，避免空推送浪费请求
    const content = applyTemplate(payload, config.general)
    if (content === null)
      return

    // access_token 有效期 2 小时、告警推送低频，按次获取不做缓存
    const tokenResult = await request({
      method: 'GET',
      url: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
      params: { corpid: config.corpId, corpsecret: config.corpSecret },
      proxy: config.general?.proxy,
    })
    if (!tokenResult.success) {
      throw new Error(`企业微信应用获取 access_token 失败：${tokenResult.error ?? '未知错误'}`)
    }
    const tokenData = tokenResult.data as { errcode?: number, errmsg?: string, access_token?: string } | null
    if (!tokenData?.access_token) {
      throw new Error(`企业微信应用获取 access_token 失败 [${tokenData?.errcode}] ${tokenData?.errmsg ?? ''}`.trim())
    }

    const body = {
      touser: config.toUser.join('|'),
      msgtype: 'text',
      agentid: config.agentId,
      text: {
        content,
      },
      safe: 0,
    }

    const result = await request({
      method: 'POST',
      url: 'https://qyapi.weixin.qq.com/cgi-bin/message/send',
      params: { access_token: tokenData.access_token },
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`企业微信应用请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { errcode?: number, errmsg?: string } | null
    if (res?.errcode !== 0) {
      throw new Error(`企业微信应用返回业务错误 [${res?.errcode}] ${res?.errmsg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<WeComAppConfig>
