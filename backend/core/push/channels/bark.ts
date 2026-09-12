import type { BarkConfig } from '../config/bark'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Bark 渠道推送器
 *
 * @param config.deviceKey 设备 Key
 * @param config.server 自建服务地址
 * @param config.url 跳转URL
 * @param config.group 通知分组
 * @param config.sound 提示音
 * @param config.icon 通知图标 URL
 * @param config.level 推送级别
 * @param config.call 重复响铃
 * @param config.badge 角标数字
 */
export default async function pushBark(config: BarkConfig, payload: PushPayload) {
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
  })
  if (!result.success) {
    throw new Error(`Bark 请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, message?: string } | null
  if (data?.code !== 200) {
    throw new Error(`Bark 返回业务错误 [${data?.code}] ${data?.message ?? ''}`.trim())
  }
}
