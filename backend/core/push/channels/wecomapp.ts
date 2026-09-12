import type { WeComAppConfig } from '../config/wecomapp'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * 企业微信应用渠道推送器
 *
 * @param config.corpId 企业 ID
 * @param config.corpSecret 应用密钥
 * @param config.agentId 应用 AgentId
 * @param config.toUser 接收成员
 */
export default async function pushWeComApp(config: WeComAppConfig, payload: PushPayload) {
  // access_token 有效期 2 小时、告警推送低频，按次获取不做缓存
  const tokenResult = await request({
    method: 'GET',
    url: `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(config.corpId)}&corpsecret=${encodeURIComponent(config.corpSecret)}`,
  })
  if (!tokenResult.success) {
    throw new Error(`企业微信应用获取 access_token 失败：${tokenResult.error ?? '未知错误'}`)
  }
  const tokenData = tokenResult.data as { errcode?: number, errmsg?: string, access_token?: string } | null
  if (!tokenData?.access_token) {
    throw new Error(`企业微信应用获取 access_token 失败 [${tokenData?.errcode}] ${tokenData?.errmsg ?? ''}`.trim())
  }

  // 无独立标题字段，标题并入正文开头
  const body = {
    touser: config.toUser.join('|'),
    msgtype: 'text',
    agentid: config.agentId,
    text: {
      content: `${payload.title}\n\n${payload.content}`,
    },
    safe: 0,
  }

  const result = await request({
    method: 'POST',
    url: `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${tokenData.access_token}`,
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`企业微信应用请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { errcode?: number, errmsg?: string } | null
  if (data?.errcode !== 0) {
    throw new Error(`企业微信应用返回业务错误 [${data?.errcode}] ${data?.errmsg ?? ''}`.trim())
  }
}
