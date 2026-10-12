import type { GeneralConfig, PushPayload } from './types'
import { dateToString } from '../../utils'

/**
 * 渲染自定义消息模板；模板未配置或渲染结果为空白时返回 null，降级语义由调用方决定
 */
export function applyTemplate(payload: PushPayload, general: GeneralConfig | undefined): string | null {
  const template = general?.messageTemplate?.trim()
  if (!template) {
    return null
  }
  // 转换真实换行符、一次性替换，标题/内容中的字面量占位符不会被二次展开
  const rendered = template
    .split('\\n')
    .join('\n')
    .replace(/\{\{(title|content|time)\}\}/g, (_, key) => key === 'title' ? payload.title : key === 'content' ? payload.content : dateToString(new Date()))
  return rendered.trim() ? rendered : null
}
