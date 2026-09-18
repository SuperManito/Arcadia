import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'
import { applyTemplate } from '../applyTemplate'

interface WxPusherConfig extends BaseChannelConfig {
  appToken: string
  uids?: string[]
  topicIds?: Array<string | number>
  url?: string
}

/**
 * WxPusher
 */
export const WxPusher = {
  type: 'wxpusher',
  configRules: [
    ['appToken', [true, 'string']],
    ['uids', [false, 'string[]']],
    ['topicIds', [false, 'object']],
    ['url', [false, 'string']],
  ],
  pusher: async (config, payload) => {
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

    // summary 始终用原始标题，不受模板影响
    const content = applyTemplate(payload, config.general)
    if (content === null)
      return
    const body: Record<string, unknown> = {
      appToken: config.appToken,
      content,
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
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`WxPusher 请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, msg?: string } | null
    if (res?.code !== 1000) {
      throw new Error(`WxPusher 返回业务错误 [${res?.code}] ${res?.msg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<WxPusherConfig>
