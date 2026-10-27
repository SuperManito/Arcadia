import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

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
  singleBody: true,
  summaryTitle: true,
  configRules: [
    [
      'appToken',
      [true, 'string'],
    ],
    [
      'uids',
      [false, 'string[]'],
    ],
    [
      'topicIds',
      [false, 'object'],
    ],
    [
      'url',
      [false, 'string'],
    ],
  ],
  rateLimit: {
    // 官方限制最大 QPS 2
    concurrency: 1,
    limits: [
      { count: 2, seconds: 1 },
    ],
  },
  validateConfig: (config) => {
    if ((config.uids?.length ?? 0) === 0 && (config.topicIds?.length ?? 0) === 0) {
      throw new Error('uids 与 topicIds 不能同时为空')
    }
  },
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

    const body: Record<string, unknown> = {
      appToken: config.appToken,
      content: payload.content,
      // summary 始终用原始标题，不受模板渲染影响
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
