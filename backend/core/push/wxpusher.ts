import type { PushPayload, WxpusherConfig } from './types'
import { request } from '../../utils/httpUtil'

/**
 * wxpusher 渠道推送器
 *
 * @param config.appToken 应用 Token
 * @param config.uids 用户 ID 列表（可选）
 * @param config.topicIds 主题 ID 列表（可选）
 * @param config.url 跳转URL（可选）
 */
export function cleanConfig(config: Record<string, unknown>): Record<string, unknown> {
  const topicIds: number[] = []
  for (const item of config.topicIds as Array<string | number>) {
    const id = Number(item)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('topicIds 元素必须是正整数')
    }
    if (!topicIds.includes(id)) {
      topicIds.push(id)
    }
  }
  const uids = config.uids as string[]
  if (uids.length === 0 && topicIds.length === 0) {
    throw new Error('uids 与 topicIds 至少提供一组')
  }
  return { ...config, topicIds }
}

export default async function pushWxpusher(config: WxpusherConfig, payload: PushPayload) {
  const uids = config.uids ?? []
  const topicIds = config.topicIds ?? []
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
    body,
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
