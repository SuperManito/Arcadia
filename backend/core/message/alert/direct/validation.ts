import type {
  CleanedMessageAlertDirectKeyword,
  CleanedMessageAlertDirectRulePayload,
  MessageAlertDirectRulePayloadInput,
  MessageAlertDirectTitleMode,
} from './types'
import db from '../../../../db'
import { validateReplaceText } from '../../../alert'
import {
  MESSAGE_ALERT_RULE_NAME_MAX_LENGTH,
} from '../types'
import {
  MESSAGE_ALERT_DIRECT_KEYWORD_CHANNEL_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_TITLE_MODES,
  MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH,
} from './types'
import { expandKeywordPattern } from './match'

// 保存与试测共用，不查库；收信人数量不设上限
export function validateMessageAlertDirectKeywords(raw: unknown): CleanedMessageAlertDirectKeyword[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('至少需要一条收信人')
  }
  const seenReceivers = new Set<string>()
  return raw.map((item, index) => {
    const n = index + 1
    const receiver = typeof item?.receiver === 'string' ? item.receiver.trim() : ''
    if (!receiver) {
      throw new Error(`收信人 ${n} 的标识不能为空`)
    }
    if (receiver.length > MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_MAX_LENGTH) {
      throw new Error(`收信人 ${n} 的标识长度不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_RECEIVER_MAX_LENGTH} 个字符`)
    }
    // 留空即按收信人标识包含匹配，库里只存用户填写的内容，不烘焙派生值
    const pattern = typeof item?.pattern === 'string' ? item.pattern.trim() : ''
    if (pattern.length > MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH) {
      throw new Error(`收信人 ${n} 的正则匹配表达式长度不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_MAX_LENGTH} 个字符`)
    }
    // 收信人占位符展开后才是实际参与匹配的正则，语法校验针对展开结果
    if (pattern) {
      try {
        void new RegExp(expandKeywordPattern(pattern, receiver))
      }
      catch {
        throw new Error(`收信人 ${n} 的正则匹配表达式不是有效的正则表达式`)
      }
    }
    // 一行对应一个收信人：收信人标识必填，同标识多行属重复配置
    if (seenReceivers.has(receiver)) {
      throw new Error(`收信人 ${n} 的标识与其他收信人重复`)
    }
    seenReceivers.add(receiver)
    const channelIds: number[] = []
    for (const rawId of Array.isArray(item.channelIds) ? item.channelIds : []) {
      const id = Number(rawId)
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error(`收信人 ${n} 的渠道参数无效（参数值类型错误）`)
      }
      if (!channelIds.includes(id)) {
        channelIds.push(id)
      }
    }
    if (channelIds.length > MESSAGE_ALERT_DIRECT_KEYWORD_CHANNEL_MAX_COUNT) {
      throw new Error(`收信人 ${n} 绑定的渠道数量不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_CHANNEL_MAX_COUNT} 个`)
    }
    const remark = typeof item?.remark === 'string' ? item.remark.trim() : ''
    if (remark.length > MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH) {
      throw new Error(`收信人 ${n} 的备注长度不能超过 ${MESSAGE_ALERT_DIRECT_KEYWORD_REMARK_MAX_LENGTH} 个字符`)
    }
    const enabled = item?.enabled ?? 1
    if (enabled !== 0 && enabled !== 1) {
      throw new Error(`收信人 ${n} 的启用参数无效（参数值类型错误）`)
    }
    // 启用必须有推送目标，否则命中后无处可推；未关联渠道只能保持禁用
    if (enabled === 1 && channelIds.length === 0) {
      throw new Error(`收信人 ${n} 未关联通知渠道，不能启用`)
    }
    return { pattern, channelIds, receiver, remark, enabled }
  })
}

// 保存与试测共用
export function validateMessageAlertDirectTitle(body: { titleMode?: unknown, titleTemplate?: unknown }): {
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
} {
  const titleMode = (typeof body.titleMode === 'string' ? body.titleMode : 'original') as MessageAlertDirectTitleMode
  if (!MESSAGE_ALERT_DIRECT_TITLE_MODES.includes(titleMode)) {
    throw new Error('标题模式无效')
  }
  let titleTemplate = typeof body.titleTemplate === 'string' ? body.titleTemplate.trim() : ''
  if (titleMode === 'template') {
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
 * 名称与全局规则共用命名空间查重；收信人由独立端点维护，不在本载荷内
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
  const contentReplace = validateReplaceText(body.contentReplace)
  // 无标题时标题替换永不生效，直接落空串而不是保存一条死配置
  const titleReplace = titleMode === 'none' ? '' : validateReplaceText(body.titleReplace)

  const alertRuleIds: number[] = []
  for (const rawId of body.alertRuleIds ?? []) {
    const id = Number(rawId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('参数 alertRuleIds 无效（参数值类型错误）')
    }
    if (alertRuleIds.includes(id)) {
      continue
    }
    alertRuleIds.push(id)
  }
  if (alertRuleIds.length > MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT) {
    throw new Error(`绑定全局规则数量不能超过 ${MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT} 条`)
  }

  if (options?.excludeId === undefined) {
    const count = await db.messageAlertDirectRule.count()
    if (count >= MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT) {
      throw new Error(`一对一规则数量不能超过 ${MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT} 条`)
    }
  }

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

  if (alertRuleIds.length > 0) {
    const rules = await db.messageAlertRule.findMany({
      where: { id: { in: alertRuleIds } },
      select: { id: true },
    })
    if (rules.length !== alertRuleIds.length) {
      throw new Error('绑定的全局规则不存在')
    }
  }

  return {
    name,
    titleMode,
    titleTemplate,
    contentReplace,
    titleReplace,
    alertRuleIds,
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
