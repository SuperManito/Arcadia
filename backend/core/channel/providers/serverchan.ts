import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface ServerChanConfig extends BaseChannelConfig {
  sendKey: string
}

/**
 * Server 酱（ServerChan）
 */
export const ServerChan = {
  type: 'serverchan',
  configRules: [
    ['sendKey', [true, 'string']],
  ],
  pusher: async (config, payload) => {
    // sendKey 以 sctp<数字>t 开头走新版独立域名，其余走 sctapi 通用域名
    const match = config.sendKey.match(/^sctp(\d+)t/)
    const url = match
      ? `https://${match[1]}.push.ft07.com/send/${config.sendKey}.send`
      : `https://sctapi.ftqq.com/${config.sendKey}.send`

    const body = {
      title: payload.title,
      desp: payload.content,
    }

    const result = await request({
      method: 'POST',
      url,
      data: body,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Server酱请求失败：${result.error ?? '未知错误'}`)
    }
    const res = result.data as { code?: number, errno?: number, message?: string, errmsg?: string } | null
    const failed = (typeof res?.code === 'number' && res.code !== 0) || (typeof res?.errno === 'number' && res.errno !== 0)
    if (failed) {
      throw new Error(`Server酱返回业务错误 [${res?.code ?? res?.errno}] ${res?.message ?? res?.errmsg ?? ''}`.trim())
    }
  },
} satisfies ChannelDefinition<ServerChanConfig>
