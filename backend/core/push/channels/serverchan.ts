import type { ServerChanConfig } from '../config/serverchan'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Server 酱渠道推送器
 *
 * @param config.sendKey SendKey
 */
export default async function pushServerChan(config: ServerChanConfig, payload: PushPayload) {
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
  })
  if (!result.success) {
    throw new Error(`Server酱请求失败：${result.error ?? '未知错误'}`)
  }
  const data = result.data as { code?: number, errno?: number, message?: string, errmsg?: string } | null
  const failed = (typeof data?.code === 'number' && data.code !== 0) || (typeof data?.errno === 'number' && data.errno !== 0)
  if (failed) {
    throw new Error(`Server酱返回业务错误 [${data?.code ?? data?.errno}] ${data?.message ?? data?.errmsg ?? ''}`.trim())
  }
}
