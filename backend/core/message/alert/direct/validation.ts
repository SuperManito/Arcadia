import type {
  CleanedMessageAlertDirectKeyword,
  CleanedMessageAlertDirectRulePayload,
  MessageAlertDirectRulePayloadInput,
  MessageAlertDirectTitleMode,
} from './types'
import db from '../../../../db'
import {
  MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT,
  MESSAGE_ALERT_RULE_NAME_MAX_LENGTH,
} from '../types'
import {
  MESSAGE_ALERT_DIRECT_KEYWORD_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_TITLE_MODES,
  MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH,
} from './types'

// 保存与试测共用，不查库
export function validateMessageAlertDirectKeywords(raw: unknown): CleanedMessageAlertDirectKeyword[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('至少需要一条关键字')
  }
  if (raw.length > MESSAGE_ALERT_DIRECT_KEYWORD_MAX_COUNT) {
    throw new Error(`关键字数量不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_MAX_COUNT} 条`)
  }
  const seen = new Set<string>()
  return raw.map((item, index) => {
    const n = index + 1
    const keyword = typeof item?.keyword === 'string' ? item.keyword.trim() : ''
    if (!keyword) {
      throw new Error(`关键字 ${n} 不能为空`)
    }
    if (keyword.length > MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH) {
      throw new Error(`关键字 ${n} 长度不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH} 个字符`)
    }
    if (seen.has(keyword)) {
      throw new Error(`关键字 ${n} 与其他关键字重复`)
    }
    seen.add(keyword)
    const channelIds: number[] = []
    for (const rawId of Array.isArray(item.channelIds) ? item.channelIds : []) {
      const id = Number(rawId)
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error(`关键字 ${n} 的渠道参数无效（参数值类型错误）`)
      }
      if (!channelIds.includes(id)) {
        channelIds.push(id)
      }
    }
    if (channelIds.length === 0) {
      throw new Error(`关键字 ${n} 至少需要绑定一个通知渠道`)
    }
    if (channelIds.length > MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT) {
      throw new Error(`关键字 ${n} 绑定的渠道数量不能超过 ${MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT} 个`)
    }
    const remark = typeof item?.remark === 'string' ? item.remark.trim() : ''
    if (remark.length > MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH) {
      throw new Error(`关键字 ${n} 的备注长度不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH} 个字符`)
    }
    const enabled = item?.enabled ?? 1
    if (enabled !== 0 && enabled !== 1) {
      throw new Error(`关键字 ${n} 的启用参数无效（参数值类型错误）`)
    }
    return { keyword, channelIds, remark, enabled }
  })
}

// 保存与试测共用
export function validateMessageAlertDirectTitle(body: { titleMode?: unknown, titleTemplate?: unknown }): {
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
} {
  const titleMode = (typeof body.titleMode === 'string' ? body.titleMode : 'default') as MessageAlertDirectTitleMode
  if (!MESSAGE_ALERT_DIRECT_TITLE_MODES.includes(titleMode)) {
    throw new Error('标题模式无效')
  }
  let titleTemplate = typeof body.titleTemplate === 'string' ? body.titleTemplate.trim() : ''
  if (titleMode === 'custom') {
    if (!titleTemplate) {
      throw new Error('自定义标题模板不能为空')
    }
    if (titleTemplate.length > MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH) {
      throw new Error(`标题模板长度不能超过 ${MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH} 个字符`)
    }
  }
  else {
    titleTemplate = ''
  }
  return { titleMode, titleTemplate }
}

/**
 * 名称与告警规则共用命名空间查重；关键字由独立端点维护，不在本载荷内
 */
export async function validateMessageAlertDirectRulePayload(
  body: MessageAlertDirectRulePayloadInput,
  options?: { excludeId?: number },
): Promise<CleanedMessageAlertDirectRulePayload> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw new Error('规则名称不能为空')
  }
  if (name.length > MESSAGE_ALERT_RULE_NAME_MAX_LENGTH) {
    throw new Error(`规则名称长度不能超过 ${MESSAGE_ALERT_RULE_NAME_MAX_LENGTH} 个字符`)
  }

  const { titleMode, titleTemplate } = validateMessageAlertDirectTitle(body)

  if (options?.excludeId === undefined) {
    const count = await db.messageAlertDirectRule.count()
    if (count >= MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT) {
      throw new Error(`一对一规则数量不能超过 ${MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT} 条`)
    }
  }

  // 共用命名空间：告警规则与一对一规则名都不可重名
  const [ruleDuplicated, directDuplicated] = await Promise.all([
    db.messageAlertRule.findFirst({ where: { name }, select: { id: true } }),
    db.messageAlertDirectRule.findFirst({
      where: {
        name,
        ...(options?.excludeId !== undefined ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    }),
  ])
  if (ruleDuplicated || directDuplicated) {
    throw new Error('规则名称已存在')
  }

  return {
    name,
    titleMode,
    titleTemplate,
  }
}

/**
 * 允许空数组清空；渠道需真实存在
 */
export async function validateMessageAlertDirectKeywordPayload(raw: unknown): Promise<CleanedMessageAlertDirectKeyword[]> {
  if (!Array.isArray(raw)) {
    throw new Error('参数 keywords 无效（参数值类型错误）')
  }
  const keywords = raw.length === 0 ? [] : validateMessageAlertDirectKeywords(raw)
  const allChannelIds = [...new Set(keywords.flatMap(keyword => keyword.channelIds))]
  if (allChannelIds.length > 0) {
    const channels = await db.notificationChannel.$list(
      { where: { id: { in: allChannelIds } } },
      { select: { id: true } },
    )
    if (channels.length !== allChannelIds.length) {
      throw new Error('渠道不存在')
    }
  }
  return keywords
}
