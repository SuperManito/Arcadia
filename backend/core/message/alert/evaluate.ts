import type { ConditionInput } from '../../alert'
import type { MessageAlertContext, MessageAlertRuleInput } from './types'
import type { PushSession } from './pushSession'
import { logger } from '../../../utils/logger'
import { evaluateConditions, parseMultiValue } from '../../alert'
import { recordSessionFailure } from './pushSession'

// 规则内条件并行、规则间分批，峰值正则任务数 = 批大小 × 单规则条件上限，压在 worker 队列上限以内
const RULE_EVAL_BATCH_SIZE = 5

/**
 * 求值所需的最小规则结构：调用方传入数据库关联查询结果，字段子集即可
 */
export interface EvaluableRule {
  id: number
  name: string
  logic: string
  categories: string
  types: string
  conditions: ConditionInput[]
  channels: Array<{ channel: { name: string, type: string } }>
}

// categories / types 为空表示不限制
function matchMessageAlertFilters(msg: MessageAlertContext, rule: MessageAlertRuleInput): boolean {
  const categories = parseMultiValue(rule.categories)
  if (categories.length > 0 && !categories.includes(msg.category)) {
    return false
  }
  const types = parseMultiValue(rule.types)
  if (types.length > 0 && !types.includes(msg.type)) {
    return false
  }
  return true
}

// 返回逐条条件结果供测试接口展示命中明细，matched 含分类/级别范围过滤，failed 表示存在不可判定的条件
export async function evaluateMessageAlertRule(msg: MessageAlertContext, rule: MessageAlertRuleInput): Promise<{
  matched: boolean
  failed: boolean
  conditions: Array<{ sort: number, matched: boolean, failed?: boolean }>
}> {
  // 范围过滤不通过时跳过条件求值，此时 conditions 为空数组
  if (!matchMessageAlertFilters(msg, rule)) {
    return {
      matched: false,
      failed: false,
      conditions: [],
    }
  }
  return evaluateConditions({
    title: msg.title,
    content: msg.content,
  }, rule.logic, rule.conditions)
}

export async function evaluateRules<T extends EvaluableRule>(
  rules: T[],
  msg: MessageAlertContext,
  session: PushSession,
): Promise<T[]> {
  const context = { title: msg.title, content: msg.content, category: msg.category, type: msg.type }
  const hits: T[] = []
  for (let start = 0; start < rules.length; start += RULE_EVAL_BATCH_SIZE) {
    await Promise.all(rules.slice(start, start + RULE_EVAL_BATCH_SIZE).map(async (rule) => {
      try {
        const result = await evaluateMessageAlertRule(context, {
          logic: rule.logic,
          categories: rule.categories,
          types: rule.types,
          conditions: rule.conditions,
        })
        if (result.failed) {
          throw new Error('规则条件求值超时或异常')
        }
        if (result.matched) {
          hits.push(rule)
        }
      }
      catch (e: any) {
        // 求值失败不能静默当不命中，触发规则漏判会让一对一与全局推送整体不发且无可见线索
        logger.error('[消息中心监控告警] 规则求值异常', JSON.stringify({ ruleId: rule.id, ruleName: rule.name }), e)
        if (rule.channels.length > 0) {
          for (const link of rule.channels) {
            recordSessionFailure(session, {
              ruleName: rule.name,
              channelName: link.channel.name,
              channelType: link.channel.type,
              reason: '规则条件求值超时或异常，未推送',
            })
          }
        }
        else {
          // 仅作一对一触发源的规则没有渠道，规则级记账保证失败可见
          recordSessionFailure(session, {
            ruleName: rule.name,
            channelName: '（一对一触发源）',
            channelType: '',
            reason: '规则条件求值超时或异常，未推送',
          })
        }
      }
    }))
  }
  return hits
}
