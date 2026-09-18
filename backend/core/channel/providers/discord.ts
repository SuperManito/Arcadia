import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface DiscordConfig extends BaseChannelConfig {
  webhookUrl: string
  /** 机器人名称 */
  username?: string
  /** 发送目标 */
  channelType?: 'channel' | 'createNewForumPost' | 'postToThread'
  /** 论坛帖标题 */
  postName?: string
  /** 线程 ID */
  threadId?: string
  /** 静默通知 */
  suppressNotifications?: boolean
}

/**
 * Discord
 */
export const Discord = {
  type: 'discord',
  configRules: [
    ['webhookUrl', [true, 'string']],
    ['username', [false, 'string']],
    ['channelType', [false, ['channel', 'createNewForumPost', 'postToThread']]],
    ['postName', [false, 'string']],
    ['threadId', [false, 'string']],
    ['suppressNotifications', [false, 'boolean']],
  ],
  pusher: async (config, payload) => {
    const channelType = config.channelType ?? 'channel'

    const params: Record<string, string> = {}
    if (channelType === 'postToThread' && config.threadId) {
      params.thread_id = config.threadId
    }

    const content = applyTemplate(payload, config.general)
    if (content === null)
      return
    const body: Record<string, unknown> = {
      content,
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
      url: config.webhookUrl,
      params,
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    // 成功时 Discord 返回 204 No Content，无业务码，仅依据 HTTP 状态判定
    if (!result.success) {
      throw new Error(`Discord请求失败：${result.error ?? '未知错误'}`)
    }
  },
} satisfies ChannelDefinition<DiscordConfig>
