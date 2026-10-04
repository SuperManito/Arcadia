import type {
  SimpleOperator,
} from '../../../alert/matcher'
import type {
  CleanedMessageAlertDirectCondition,
  CleanedMessageAlertDirectRuleCore,
  CleanedMessageAlertDirectRulePayload,
  MessageAlertDirectConditionInput,
  MessageAlertDirectRuleCoreInput,
  MessageAlertDirectRulePayloadInput,
  MessageAlertDirectTitleMode,
} from './types'
import db from '../../../../db'
import {
  assertValidRegexPattern,
  CONDITION_MODES,
  ConditionMode,
  REGEX_OPERATORS,
  RULE_LOGICS,
  RuleLogic,
  SIMPLE_OPERATORS,
  VALUE_OPTIONAL_OPERATORS,
} from '../../../alert/matcher'
import {
  MESSAGE_ALERT_CONDITION_MAX_COUNT,
  MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH,
  MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT,
  MESSAGE_ALERT_RULE_NAME_MAX_LENGTH,
} from '../types'
import {
  MESSAGE_ALERT_DIRECT_CONDITION_REMARK_MAX_LENGTH,
  MESSAGE_ALERT_DIRECT_RULE_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_TITLE_MODES,
  MESSAGE_ALERT_DIRECT_TITLE_TEMPLATE_MAX_LENGTH,
} from './types'

// field 恒为 content：一对一规则没有范围字段，仅对消息内容做细分
const DIRECT_CONDITION_FIELD = 'content'

function normalizeDirectCondition(raw: MessageAlertDirectConditionInput, index: number): CleanedMessageAlertDirectCondition {
  const n = index + 1
  const mode = raw.mode
  if (!CONDITION_MODES.includes(mode as ConditionMode)) {
    throw new Error(`条件 ${n} 的匹配模式无效`)
  }
  const operator = raw.operator
  const allowedOperators: readonly string[] = mode === ConditionMode.REGEX ? REGEX_OPERATORS : SIMPLE_OPERATORS
  if (!allowedOperators.includes(operator as string)) {
    throw new Error(`条件 ${n} 的匹配运算符无效`)
  }
  let value = typeof raw.value === 'string' ? raw.value : ''
  if (mode === ConditionMode.REGEX) {
    // 正则首尾空白可能有语义，保持原值；非空与长度由 assertValidRegexPattern 校验
    if (!value) {
      throw new Error(`条件 ${n} 的匹配内容不能为空`)
    }
    try {
      assertValidRegexPattern(value)
    }
    catch {
      throw new Error(`条件 ${n} 的正则表达式无效`)
    }
  }
  else {
    // 与消息 content 落库前 trim 对齐，否则 equal / starts_with 等运算符永不命中
    value = value.trim()
    if (VALUE_OPTIONAL_OPERATORS.includes(operator as SimpleOperator)) {
      value = ''
    }
    else if (!value) {
      throw new Error(`条件 ${n} 的匹配内容不能为空`)
    }
    if (value.length > MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH) {
      throw new Error(`条件 ${n} 的匹配内容长度不能超过 ${MESSAGE_ALERT_CONDITION_VALUE_MAX_LENGTH} 个字符`)
    }
  }
  const enabled = raw.enabled === undefined ? 1 : Number(raw.enabled)
  if (enabled !== 0 && enabled !== 1) {
    throw new Error(`条件 ${n} 的启用状态无效`)
  }
  const remark = typeof raw.remark === 'string' ? raw.remark.trim() : ''
  if (remark.length > MESSAGE_ALERT_DIRECT_CONDITION_REMARK_MAX_LENGTH) {
    throw new Error(`条件 ${n} 的备注长度不能超过 ${MESSAGE_ALERT_DIRECT_CONDITION_REMARK_MAX_LENGTH} 个字符`)
  }
  return {
    mode: mode as string,
    field: DIRECT_CONDITION_FIELD,
    operator: operator as string,
    value,
    enabled,
    remark,
  }
}

// 保存与测试共用，不查库
export function validateMessageAlertDirectRuleCore(body: MessageAlertDirectRuleCoreInput): CleanedMessageAlertDirectRuleCore {
  const logic = body.logic ?? RuleLogic.AND
  if (!RULE_LOGICS.includes(logic as RuleLogic)) {
    throw new Error('条件组合逻辑无效')
  }
  if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
    // 一对一没有范围字段兜底，无条件会退化为无条件转发匹配行
    throw new Error('至少需要一条匹配条件')
  }
  if (body.conditions.length > MESSAGE_ALERT_CONDITION_MAX_COUNT) {
    throw new Error(`匹配条件数量不能超过 ${MESSAGE_ALERT_CONDITION_MAX_COUNT} 条`)
  }
  const conditions = body.conditions.map((raw, index) => normalizeDirectCondition(raw ?? {}, index))
  return { logic, conditions }
}

/**
 * 一对一规则保存载荷校验：名称与告警规则共用命名空间查重
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

  const core = validateMessageAlertDirectRuleCore(body)

  const extractRegex = typeof body.extractRegex === 'string' ? body.extractRegex : ''
  if (!extractRegex) {
    throw new Error('截取正则不能为空')
  }
  try {
    assertValidRegexPattern(extractRegex)
  }
  catch {
    throw new Error('截取正则表达式无效')
  }

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

  const channelIds: number[] = []
  for (const rawId of body.channelIds ?? []) {
    const id = Number(rawId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('参数 channelIds 无效（参数值类型错误）')
    }
    if (channelIds.includes(id)) {
      continue
    }
    channelIds.push(id)
  }
  if (channelIds.length > MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT) {
    throw new Error(`关联渠道数量不能超过 ${MESSAGE_ALERT_RULE_CHANNEL_MAX_COUNT} 个`)
  }

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

  if (channelIds.length > 0) {
    const channels = await db.notificationChannel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true },
    })
    if (channels.length !== channelIds.length) {
      throw new Error('渠道不存在')
    }
  }

  return {
    name,
    ...core,
    extractRegex,
    titleMode,
    titleTemplate,
    channelIds,
  }
}
