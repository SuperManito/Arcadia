import type { AppriseConfig } from '../config/apprise'
import type { PushPayload } from '../types'
import { execFile } from 'node:child_process'

/**
 * Apprise 渠道推送器
 *
 * @param config.url Apprise URL
 */
export default async function pushApprise(config: AppriseConfig, payload: PushPayload) {
  const { stdout, stderr, code } = await new Promise<{ stdout: string, stderr: string, code: number | string }>((resolve) => {
    execFile('apprise', ['-t', payload.title, '-b', payload.content, config.url], { encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code: error ? (error.code ?? 1) : 0 })
    })
  })
  if (code === 0) {
    return
  }
  if (typeof code === 'string') {
    throw new Error(`Apprise 推送失败：无法执行 apprise 命令（${code}），请确认已安装 pip3 install apprise`)
  }
  const output = `${stdout}${stderr}`.trim()
  throw new Error(`Apprise 推送失败：${output || `退出码 ${code}`}`)
}
