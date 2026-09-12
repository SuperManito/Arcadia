import type { DiscordConfig } from '../config/discord'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Discord 渠道推送器
 *
 * @param config.webhookUrl Webhook 地址
 * @param config.username 机器人名称
 * @param config.channelType 发送目标
 * @param config.postName 论坛帖标题
 * @param config.threadId 线程 ID
 * @param config.suppressNotifications 抑制通知
 */
export default async function pushDiscord(config: DiscordConfig, payload: PushPayload) {
  const channelType = config.channelType ?? 'channel'

  let url = config.webhookUrl
  if (channelType === 'postToThread' && config.threadId) {
    url += `${url.includes('?') ? '&' : '?'}thread_id=${encodeURIComponent(config.threadId)}`
  }

  // 无独立标题字段，标题并入正文开头
  const body: Record<string, unknown> = {
    content: `${payload.title}\n${payload.content}`,
  }
  if (config.username) {
    body.username = config.username
  }
  if (channelType === 'createNewForumPost' && config.postName) {
    body.thread_name = config.postName
  }
  if (config.suppressNotifications) {
    body.flags = 1 << 12
  }

  const result = await request({
    method: 'POST',
    url,
    data: body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  // 成功时 Discord 返回 204 No Content，无业务码，仅依据 HTTP 状态判定
  if (!result.success) {
    throw new Error(`Discord请求失败：${result.error ?? '未知错误'}`)
  }
}
