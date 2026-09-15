import type { GeneralConfig, PushPayload } from './types'

/**
 * 渲染消息模板
 *
 * @description 适用于没有独立标题的消息推送以及自定义消息模板的场景
 */
export function applyTemplate(payload: PushPayload, general: GeneralConfig | undefined): string | null {
  const title = payload.title ?? ''
  const content = payload.content ?? ''
  const template = general?.messageTemplate?.trim()
  // 无自定义消息模板固定使用标题与正文空行分隔
  if (!template) {
    return `${title}\n\n${content}`
  }
  // 转换真实换行符、不强制插入标题和内容
  const rendered = template
    .split('\\n')
    .join('\n')
    .split('{{title}}')
    .join(title)
    .split('{{content}}')
    .join(content)
  return rendered.trim() ? rendered : null
}
