import type {
  CleanedMessageAlertDirectReceiver,
  CleanedMessageAlertDirectRulePayload,
  MessageAlertDirectRulePayloadInput,
  MessageAlertDirectTitleMode,
} from './types'
import db from '../../../../db'
import { stringifyReplacePairs, validateReplacePairs } from '../../../alert'
import { validateReceiverOverrides } from './overrides'
import {
  MESSAGE_ALERT_RULE_NAME_MAX_LENGTH,
} from '../types'
import {
  MESSAGE_ALERT_DIRECT_COMMON_PATTERN_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_RECEIVER_CHANNEL_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_RECEIVER_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER,
  MESSAGE_ALERT_DIRECT_RECEIVER_REMARK_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_TITLE_MODES,
  MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH,
} from './types'
import { expandReceiverPattern } from './match'

function cleanReceiverBase(raw: any): { receiver: string, remark: string } {
  const receiver = typeof raw?.receiver === 'string'
    ? raw.receiver.trim()
    : ''
  if (!receiver) {
    throw new Error('收信人标识不能为空')
  }
  if (receiver.length > MESSAGE_ALERT_DIRECT_RECEIVER_MAX_LENGTH) {
    throw new Error(`收信人标识长度不能超过 ${MESSAGE_ALERT_DIRECT_RECEIVER_MAX_LENGTH} 个字符`)
  }
  const remark = typeof raw?.remark === 'string'
    ? raw.remark.trim()
    : ''
  if (remark.length > MESSAGE_ALERT_DIRECT_RECEIVER_REMARK_MAX_LENGTH) {
    throw new Error(`收信人的备注长度不能超过 ${MESSAGE_ALERT_DIRECT_RECEIVER_REMARK_MAX_LENGTH} 个字符`)
  }
  return { receiver, remark }
}

function cleanReceiverChannelIds(raw: unknown): number[] {
  const channelIds: number[] = []
  for (const rawId of Array.isArray(raw)
    ? raw
    : []) {
    const id = Number(rawId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('收信人的渠道参数无效（参数值类型错误）')
    }
    if (!channelIds.includes(id)) {
      channelIds.push(id)
    }
  }
  if (channelIds.length > MESSAGE_ALERT_DIRECT_RECEIVER_CHANNEL_MAX_COUNT) {
    throw new Error(`收信人绑定的渠道数量不能超过 ${MESSAGE_ALERT_DIRECT_RECEIVER_CHANNEL_MAX_COUNT} 个`)
  }
  return channelIds
}

/**
 * 新增/修改单个收信人的字段校验，不查库；唯一性与渠道存在性由路由层校验。
 * 未提供 enabled 时按禁用处理：新增行默认禁用，启用必须显式关联渠道；
 * overrides 为整体替换语义，键存在=覆盖规则主体
 */
export function validateMessageAlertDirectReceiver(raw: unknown): CleanedMessageAlertDirectReceiver {
  const base = cleanReceiverBase(raw)
  const enabled = (raw as any)?.enabled ?? 0
  if (enabled !== 0 && enabled !== 1) {
    throw new Error('收信人的启用参数无效（参数值类型错误）')
  }
  const channelIds = cleanReceiverChannelIds((raw as any)?.channelIds)
  // 启用必须有推送目标，否则命中后无处可推；未关联渠道只能保持禁用
  if (enabled === 1 && channelIds.length === 0) {
    throw new Error('收信人未关联通知渠道，不能启用')
  }
  const overrides = validateReceiverOverrides((raw as any)?.overrides, base.receiver)
  return {
    ...base,
    overrides,
    enabled,
    channelIds,
  }
}

/**
 * 批量添加条目校验：白名单只取名单内容三字段，其余字段（含 enabled、channelIds）不读取，
 * 缺省语义为禁用且无渠道，与单条新增的缺省一致。
 */
export function validateMessageAlertDirectReceiverBatchItem(raw: unknown): CleanedMessageAlertDirectReceiver {
  const { receiver, overrides, remark } = (raw ?? {}) as Record<string, unknown>
  return validateMessageAlertDirectReceiver({ receiver, overrides, remark })
}

// 保存与试测共用
export function validateMessageAlertDirectTitle(body: { titleMode?: unknown, titleTemplate?: unknown }): {
  titleMode: MessageAlertDirectTitleMode
  titleTemplate: string
} {
  const titleMode = (typeof body.titleMode === 'string'
    ? body.titleMode
    : 'original') as MessageAlertDirectTitleMode
  if (!MESSAGE_ALERT_DIRECT_TITLE_MODES.includes(titleMode)) {
    throw new Error('标题模式无效')
  }
  let titleTemplate = typeof body.titleTemplate === 'string'
    ? body.titleTemplate.trim()
    : ''
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
  const name = typeof body.name === 'string'
    ? body.name.trim()
    : ''
  if (!name) {
    throw new Error('规则名称不能为空')
  }
  if (name.length > MESSAGE_ALERT_RULE_NAME_MAX_LENGTH) {
    throw new Error(`规则名称长度不能超过 ${MESSAGE_ALERT_RULE_NAME_MAX_LENGTH} 个字符`)
  }

  const { titleMode, titleTemplate } = validateMessageAlertDirectTitle(body)
  const titleMerge = body.titleMerge ?? 1
  if (titleMerge !== 0 && titleMerge !== 1) {
    throw new Error('参数 titleMerge 无效（参数值类型错误）')
  }
  const channelMerge = body.channelMerge ?? 0
  if (channelMerge !== 0 && channelMerge !== 1) {
    throw new Error('参数 channelMerge 无效（参数值类型错误）')
  }
  const preReplaces = stringifyReplacePairs(validateReplacePairs(body.preReplaces))
  const postReplaces = stringifyReplacePairs(validateReplacePairs(body.postReplaces, 'postReplaces'))

  // 正文按行 trim 后匹配，首尾空白无语义，入库前去除
  const commonPattern = typeof body.commonPattern === 'string'
    ? body.commonPattern.trim()
    : ''
  if (commonPattern.length > MESSAGE_ALERT_DIRECT_COMMON_PATTERN_MAX_LENGTH) {
    throw new Error(`正则匹配长度不能超过 ${MESSAGE_ALERT_DIRECT_COMMON_PATTERN_MAX_LENGTH} 个字符`)
  }
  // 规则级正则对所有收信人是同一个，不含占位符即每个收信人命中相同的行，属确定的串发
  if (commonPattern && !commonPattern.includes(MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER)) {
    throw new Error('正则匹配必须包含 {{receiver}}，否则所有收信人会匹配到相同的行')
  }
  // 探针编译只是语法校验，特殊标识展开后仍可能非法，由运行时匹配失败记账兜底
  if (commonPattern) {
    try {
      void new RegExp(expandReceiverPattern(commonPattern, '示例'))
    }
    catch {
      throw new Error('正则匹配不是有效的正则表达式')
    }
  }

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
    throw new Error(`关联全局告警规则数量不能超过 ${MESSAGE_ALERT_DIRECT_RULE_BIND_MAX_COUNT} 条`)
  }

  if (options?.excludeId === undefined) {
    const count = await db.messageAlertDirectRule.count()
    if (count >= MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT) {
      throw new Error(`一对一规则数量不能超过 ${MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT} 条`)
    }
  }

  const [ruleDuplicated, directDuplicated] = await Promise.all([
    db.messageAlertRule.findFirst({
      where: { name },
      select: { id: true },
    }),
    db.messageAlertDirectRule.findFirst({
      where: {
        name,
        ...(options?.excludeId !== undefined
          ? {
              id: { not: options.excludeId },
            }
          : {}),
      },
      select: { id: true },
    }),
  ])
  if (ruleDuplicated || directDuplicated) {
    throw new Error('规则名称已存在')
  }

  if (alertRuleIds.length > 0) {
    const rules = await db.messageAlertRule.findMany({
      where: {
        id: { in: alertRuleIds },
      },
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
    titleMerge,
    channelMerge,
    preReplaces,
    postReplaces,
    commonPattern,
    alertRuleIds,
  }
}
