import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface BarkConfig extends BaseChannelConfig {
  deviceKey: string
  server?: string
  url?: string
  /** 通知分组 */
  group?: string
  /** 提示音名称 */
  sound?: string
  /** 通知图标 URL */
  icon?: string
  /** 推送级别 */
  level?: 'active' | 'timeSensitive' | 'passive' | 'critical'
  /** 连续响铃约 30 秒 */
  call?: boolean
  /** 角标数字 */
  badge?: number
}

/**
 * Bark
 */
export const Bark = {
  type: 'bark',
  configRules: [
    ['deviceKey', [true, 'string']],
    ['server', [false, 'string']],
    ['url', [false, 'string']],
    ['group', [false, 'string']],
    ['sound', [false, 'string']],
    ['icon', [false, 'string']],
    ['level', [false, ['active', 'timeSensitive', 'passive', 'critical']]],
    ['call', [false, 'boolean']],
    ['badge', [false, 'number']],
  ],
  pusher: async (config, payload) => {
    const body: Record<string, unknown> = {
      title: payload.title,
      body: payload.content,
      device_key: config.deviceKey,
    }
    if (config.url) {
      body.url = config.url
    }
    if (config.group) {
      body.group = config.group
    }
    if (config.sound) {
      body.sound = config.sound
    }
    if (config.icon) {
      body.icon = config.icon
    }
    if (config.level) {
      body.level = config.level
    }
    if (config.call) {
      body.call = 1
    }
    if (typeof config.badge === 'number') {
      body.badge = config.badge
    }

    const server = (config.server || 'https://api.day.app').replace(/\/+$/, '')
    const result = await request({
      method: 'POST',
      url: `${server}/push`,
      data: body,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Bark 请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, message?: string } | null
    if (res?.code !== 200) {
      throw new Error(`Bark 返回业务错误 [${res?.code}] ${res?.message ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<BarkConfig>
