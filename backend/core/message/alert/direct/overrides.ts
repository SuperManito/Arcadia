import type { ReplacePair } from '../../../alert'
import type { MessageAlertDirectTitleMode } from './types'
import { parseReplacePairs, stringifyReplacePairs, validateReplacePairs } from '../../../alert'
import { expandReceiverPattern } from './match'
import {
  MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_TITLE_MODES,
  MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH,
} from './types'

// 可覆盖键名与一对一规则表列名对齐；键存在=覆盖规则主体，键缺失=沿用，空对象存空串
const OVERRIDE_KEYS = ['pattern', 'title_mode', 'title_template', 'title_merge', 'post_replaces'] as const

export interface MessageAlertDirectOverrideValues {
  pattern: string
  title_mode: MessageAlertDirectTitleMode
  title_template: string
  title_merge: 0 | 1
  post_replaces: string
}

export type MessageAlertDirectOverrides = Partial<MessageAlertDirectOverrideValues>

/**
 * 推送自定义写入校验：只保留合法键，无有效键返回空串（存库不落 '{}'）；
 * pattern 留空视为未自定义；title_template 只在 title_mode=template 下保留
 */
export function validateReceiverOverrides(raw: unknown, receiver: string): string {
  if (raw === undefined || raw === null) {
    return ''
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('推送自定义参数无效（参数值类型错误）')
  }
  const input = raw as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!(OVERRIDE_KEYS as readonly string[]).includes(key)) {
      throw new Error(`推送自定义包含不支持的配置项 ${key}`)
    }
  }
  const result: Record<string, unknown> = {}
  const pattern = typeof input.pattern === 'string' ? input.pattern.trim() : ''
  if (pattern) {
    if (pattern.length > MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_MAX_LENGTH) {
      throw new Error(`推送自定义的正则匹配长度不能超过 ${MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_MAX_LENGTH} 个字符`)
    }
    // {{receiver}} 占位符展开后才是实际参与匹配的正则，语法校验针对展开结果
    try {
      void new RegExp(expandReceiverPattern(pattern, receiver))
    }
    catch {
      throw new Error('推送自定义的正则匹配不是有效的正则表达式')
    }
    result.pattern = pattern
  }
  const hasTitleMode = input.title_mode !== undefined && input.title_mode !== null
  if (input.title_template !== undefined && input.title_template !== null && !hasTitleMode) {
    throw new Error('推送自定义的标题模板必须与标题模式同时提供')
  }
  if (hasTitleMode) {
    const titleMode = input.title_mode
    if (typeof titleMode !== 'string' || !(MESSAGE_ALERT_DIRECT_TITLE_MODES as readonly string[]).includes(titleMode)) {
      throw new Error('推送自定义的标题模式无效')
    }
    let titleTemplate = typeof input.title_template === 'string' ? input.title_template.trim() : ''
    if (titleMode === 'template') {
      if (!titleTemplate) {
        throw new Error('推送自定义的标题模板不能为空')
      }
      if (titleTemplate.length > MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH) {
        throw new Error(`推送自定义的标题模板长度不能超过 ${MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH} 个字符`)
      }
    }
    else {
      titleTemplate = ''
    }
    result.title_mode = titleMode
    if (titleTemplate) {
      result.title_template = titleTemplate
    }
  }
  if (input.title_merge !== undefined && input.title_merge !== null) {
    const titleMerge = input.title_merge
    if (titleMerge !== 0 && titleMerge !== 1) {
      throw new Error('推送自定义的无标题渠道仅发正文参数无效（参数值类型错误）')
    }
    result.title_merge = titleMerge
  }
  if (input.post_replaces !== undefined && input.post_replaces !== null) {
    const postReplaces = stringifyReplacePairs(validateReplacePairs(input.post_replaces, 'postReplaces'))
    if (postReplaces) {
      result.post_replaces = postReplaces
    }
  }
  return Object.keys(result).length > 0 ? JSON.stringify(result) : ''
}

/** 落库值读取：损坏或字段类型不符按未自定义处理（保存前已校验，此处只防落库内容损坏） */
export function readReceiverOverrides(json: unknown): MessageAlertDirectOverrides {
  const text = typeof json === 'string' ? json.trim() : ''
  if (!text) {
    return {}
  }
  try {
    const parsed = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const result: Record<string, unknown> = {}
    if (typeof parsed.pattern === 'string') {
      result.pattern = parsed.pattern
    }
    if (typeof parsed.title_mode === 'string' && (MESSAGE_ALERT_DIRECT_TITLE_MODES as readonly string[]).includes(parsed.title_mode)) {
      result.title_mode = parsed.title_mode
    }
    if (typeof parsed.title_template === 'string') {
      result.title_template = parsed.title_template
    }
    if (parsed.title_merge === 0 || parsed.title_merge === 1) {
      result.title_merge = parsed.title_merge
    }
    if (typeof parsed.post_replaces === 'string') {
      result.post_replaces = parsed.post_replaces
    }
    return result as MessageAlertDirectOverrides
  }
  catch {
    return {}
  }
}

/**
 * 响应格式：键名与写入/落库的 overrides 键对齐，null = 未自定义（沿用规则主体）
 */
export function receiverOverridesToResponse(json: unknown): {
  pattern: string | null
  title_mode: MessageAlertDirectTitleMode | null
  title_template: string | null
  title_merge: 0 | 1 | null
  post_replaces: ReplacePair[] | null
} {
  const overrides = readReceiverOverrides(json)
  return {
    pattern: overrides.pattern ?? null,
    title_mode: overrides.title_mode ?? null,
    title_template: overrides.title_mode === 'template' ? (overrides.title_template ?? null) : null,
    title_merge: overrides.title_merge ?? null,
    post_replaces: overrides.post_replaces ? parseReplacePairs(overrides.post_replaces) : null,
  }
}

export interface ReceiverPushConfig {
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
  titleMerge: 0 | 1
  postReplaces: string
}

/**
 * 收信人有效推送形态：自定义键覆盖规则主体；标题模式自定义时模板随之整体接管，不与规则模板混合
 */
export function resolveReceiverPushConfig(
  overrides: MessageAlertDirectOverrides,
  rule: { title_mode: string, title_template: string, title_merge: number, post_replaces: string },
): ReceiverPushConfig {
  const titleMerge = overrides.title_merge ?? (rule.title_merge === 1 ? 1 : 0)
  const postReplaces = overrides.post_replaces ?? rule.post_replaces
  if (overrides.title_mode) {
    return {
      titleMode: overrides.title_mode,
      titleTemplate: overrides.title_mode === 'template' ? (overrides.title_template ?? '') : '',
      titleMerge,
      postReplaces,
    }
  }
  return {
    titleMode: rule.title_mode as MessageAlertDirectTitleMode,
    titleTemplate: rule.title_mode === 'template' ? rule.title_template : '',
    titleMerge,
    postReplaces,
  }
}
