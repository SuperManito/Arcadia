import type { WxPusherConfig } from '../config/wxpusher'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * WxPusher 渠道推送器
 *
 * @param config.appToken 应用 Token
 * @param config.uids 用户 ID 列表
 * @param config.topicIds 主题 ID 列表
 * @param config.url 跳转URL
 */
export default async function pushWxPusher(config: WxPusherConfig, payload: PushPayload) {
  const uids = config.uids ?? []
  // topicIds 允许字符串或数字，统一转为正整数并去重后提交
  const topicIds: number[] = []
  for (const item of config.topicIds ?? []) {
    const id = Number(item)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('topicIds 元素必须是正整数')
    }
    if (!topicIds.includes(id)) {
      topicIds.push(id)
    }
  }
  if (uids.length === 0 && topicIds.length === 0) {
    throw new Error('uids 与 topicIds 不能同时为空')
  }

  const body: Record<string, unknown> = {
    appToken: config.appToken,
    content: `${payload.title}\n\n${payload.content}`,
    summary: payload.title,
    contentType: 1,
    uids,
    topicIds,
  }
  if (config.url) {
    body.url = config.url
  }

  const result = await request({
    method: 'POST',
    url: 'https://wxpusher.zjiecode.com/api/send/message',
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!result.success) {
    throw new Error(`WxPusher 请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, msg?: string } | null
  if (data?.code !== 1000) {
    throw new Error(`WxPusher 返回业务错误 [${data?.code}] ${data?.msg ?? ''}`.trim())
  }
}
