import type { ConditionInput } from '../../../alert/matcher'
import type { MessageAlertDirectContext, MessageAlertDirectTitleMode } from './types'
import { evaluateConditions, matchCondition, RuleLogic } from '../../../alert/matcher'

// 组装一对一标题：default 沿用原标题，custom 渲染模板占位符，none 不传标题
export function renderDirectTitle(
  titleMode: MessageAlertDirectTitleMode,
  titleTemplate: string,
  originalTitle: string,
  ruleName: string,
): string {
  if (titleMode === 'none') {
    return ''
  }
  if (titleMode === 'custom') {
    return titleTemplate
      .replaceAll('{{title}}', originalTitle)
      .replaceAll('{{rule}}', ruleName)
  }
  return originalTitle
}

// 直接求值接口：processor 与试测接口共用，禁用条件不参与求值（全部禁用视为未命中）
export interface DirectEvaluateInput {
  logic: string
  conditions: Array<ConditionInput & { enabled?: number }>
}

/**
 * 一对一规则条件求值：仅 enabled 条件参与，全禁用直接判未命中
 */
export async function evaluateDirectConditions(
  context: MessageAlertDirectContext,
  input: DirectEvaluateInput,
): Promise<{
  matched: boolean
  conditions: Array<{ sort: number, matched: boolean }>
}> {
  const enabled = input.conditions.filter(condition => condition.enabled !== 0)
  if (enabled.length === 0) {
    return { matched: false, conditions: [] }
  }
  // 全禁用之外只可能余 AND / OR，逻辑符兜底按 AND（与保存校验一致）
  const logic = input.logic === RuleLogic.OR ? RuleLogic.OR : RuleLogic.AND
  return evaluateConditions(context, logic, enabled)
}

/**
 * 试测预览用：返回全部条件（含禁用标注）的逐条命中明细
 */
export async function evaluateDirectConditionsForTest(
  context: MessageAlertDirectContext,
  input: DirectEvaluateInput,
): Promise<{
  matched: boolean
  conditions: Array<{ sort: number, matched: boolean, disabled: boolean }>
}> {
  const sorted = input.conditions
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  const results = await Promise.all(sorted.map(async (condition, index) => ({
    sort: condition.sort ?? index,
    matched: condition.enabled === 0 ? false : await matchCondition(context, condition),
    disabled: condition.enabled === 0,
  })))
  const hits = results.filter(item => !item.disabled).map(item => item.matched)
  // 全禁用视为未命中，其余与运行时求值同语义
  const matched = hits.length === 0
    ? false
    : (input.logic === RuleLogic.OR ? hits.some(Boolean) : hits.every(Boolean))
  return { matched, conditions: results }
}
