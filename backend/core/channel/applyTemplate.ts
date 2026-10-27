import type { GeneralConfig, PushPayload } from './types'
import { dateToString } from '../../utils'
import { TEMPLATE_CONTENT_PLACEHOLDER, TEMPLATE_TIME_PLACEHOLDER, TEMPLATE_TITLE_PLACEHOLDER } from './constants'

// 占位符名称从常量取；单遍替换，标题/内容中的字面量占位符不会被二次展开
const TEMPLATE_PLACEHOLDER_PATTERN = new RegExp(
  `\\{\\{(?:${[
    TEMPLATE_TITLE_PLACEHOLDER,
    TEMPLATE_CONTENT_PLACEHOLDER,
    TEMPLATE_TIME_PLACEHOLDER,
  ].map(name => name.slice(2, -2)).join('|')})\\}\\}`,
  'g',
)

/**
 * 渲染自定义消息模板；模板未配置或渲染结果为空白时返回 null，降级语义由调用方决定
 */
export function applyTemplate(payload: PushPayload, general: GeneralConfig | undefined): string | null {
  const template = general?.messageTemplate?.trim()
  if (!template) {
    return null
  }
  const rendered = template
    .split('\\n')
    .join('\n')
    .replace(TEMPLATE_PLACEHOLDER_PATTERN, (matched) => {
      switch (matched) {
        case TEMPLATE_TITLE_PLACEHOLDER:
          return payload.title
        case TEMPLATE_CONTENT_PLACEHOLDER:
          return payload.content
        default:
          return dateToString(new Date())
      }
    })
  return rendered.trim()
    ? rendered
    : null
}
