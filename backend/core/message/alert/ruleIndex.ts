import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import { parseMultiValue } from '../../alert'

// 启用规则的分类/级别粗判索引：未命中直接跳过全量关联查询，按维度独立近似、可能误放行但绝不漏判；
// 为空表示不限制须视为命中一切；初值全通配保证重启后不漏判，仅由规则增删改路径刷新
let enabledRuleIndex = {
  allCategories: true,
  categories: new Set<string>(),
  allTypes: true,
  types: new Set<string>(),
}

export function mayMatchRule(category: string, type: string): boolean {
  return (enabledRuleIndex.allCategories || enabledRuleIndex.categories.has(category))
    && (enabledRuleIndex.allTypes || enabledRuleIndex.types.has(type))
}

// 串行化刷新：并发增删改时按序重查，防止旧快照晚于新快照落库把索引回退到失真状态
let refreshChain: Promise<void> = Promise.resolve()

/**
 * 规则增删改后刷新粗判索引；失败只记日志不抛出，沿用旧索引的失真仅影响额外的查询或漏判，不应阻断调用方
 */
export async function refreshEnabledRuleIndex() {
  const next = refreshChain.then(refresh)
  refreshChain = next
  await next
}

async function refresh() {
  try {
    const rules = await db.messageAlertRule.$list(
      { where: { enabled: 1 } },
      { select: { categories: true, types: true } },
    )
    const categories = new Set<string>()
    const types = new Set<string>()
    let allCategories = false
    let allTypes = false
    for (const rule of rules) {
      const ruleCategories = parseMultiValue(rule.categories)
      if (ruleCategories.length === 0) {
        allCategories = true
      }
      else {
        ruleCategories.forEach(category => categories.add(category))
      }
      const ruleTypes = parseMultiValue(rule.types)
      if (ruleTypes.length === 0) {
        allTypes = true
      }
      else {
        ruleTypes.forEach(type => types.add(type))
      }
    }
    enabledRuleIndex = { allCategories, categories, allTypes, types }
  }
  catch (e: any) {
    logger.error('[消息中心监控告警] 刷新启用规则索引失败', e)
  }
}
