import type { messageModel } from '../../../db'
import type { MessageAlertContext, MessageAlertRuleInput } from './types'
import type { MessageAlertDirectTitleMode } from './direct/types'
import type { DirectPushSession } from './direct/directQueue'
import { db } from '../../../db'
import { logger } from '../../../utils/logger'
import {
  evaluateConditions,
  parseMultiValue,
} from '../../alert/matcher'
import { applyReplacements } from '../../alert/replacer'
import { closeSession, enqueueDirectPush, recordSessionFailure } from './direct/directQueue'
import { matchKeywordLineIndexes, renderDirectTitle, truncateMatchedLines } from './direct/match'

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

async function loadEnabledRules() {
  return db.messageAlertRule.$list(
    { where: { enabled: 1 } },
    {
      include: {
        conditions: { orderBy: { sort: 'asc' } },
        channels: { include: { channel: true } },
      },
    },
  )
}

// 一对一规则按命中全局规则按需加载，渠道只取推送需要的字段，避免每条消息全量拉取规则与渠道配置
async function loadHitDirectRules(ruleIds: number[]) {
  return db.messageAlertDirectRule.$list(
    {
      where: {
        enabled: 1,
        messageAlertLinks: { some: { messageAlertRuleId: { in: ruleIds } } },
      },
    },
    {
      include: {
        keywords: {
          where: { enabled: 1 },
          orderBy: { sort: 'asc' },
          include: { channels: { include: { channel: { select: { id: true, name: true, type: true, config: true } } } } },
        },
      },
    },
  )
}

// 启用规则的分类/级别粗判索引：未命中直接跳过全量关联查询，按维度独立近似、可能误放行但绝不漏判；
// 为空表示不限制须视为命中一切；初值全通配保证重启后不漏判，仅由规则增删改路径刷新
let enabledRuleIndex = {
  allCategories: true,
  categories: new Set<string>(),
  allTypes: true,
  types: new Set<string>(),
}

function mayMatchRule(category: string, type: string): boolean {
  return (enabledRuleIndex.allCategories || enabledRuleIndex.categories.has(category))
    && (enabledRuleIndex.allTypes || enabledRuleIndex.types.has(type))
}

/**
 * 规则增删改后刷新粗判索引；失败只记日志不抛出，沿用旧索引的失真仅影响额外的查询或漏判，不应阻断调用方
 */
export async function refreshEnabledRuleIndex() {
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
    logger.error('[消息中心监控告警] 刷新启用规则索引失败', { error: e?.message })
  }
}

/**
 * 告警处理入口：先求值全局规则，命中后按需加载关联一对一规则，由消息入库路径非阻塞调用
 */
export async function processMessageAlert(msg: messageModel) {
  if (!mayMatchRule(msg.category, msg.type)) {
    return
  }
  const rules = await loadEnabledRules()
  // 无渠道且未绑定一对一的规则不会产生任何推送，求值前过滤避免白白占用正则 worker 队列
  const candidateRules = rules.filter(rule => rule.channels.length > 0)
  if (candidateRules.length < rules.length) {
    const boundRuleIds = new Set(
      (await db.messageAlertRuleDirect.findMany({
        where: { messageAlertRuleId: { in: rules.filter(rule => rule.channels.length === 0).map(rule => rule.id) } },
        select: { messageAlertRuleId: true },
      })).map(link => link.messageAlertRuleId),
    )
    for (const rule of rules) {
      if (rule.channels.length === 0 && boundRuleIds.has(rule.id)) {
        candidateRules.push(rule)
      }
    }
  }
  if (candidateRules.length === 0) {
    return
  }
  // pending 初值 1 为封口哨兵，处理链路结束后经 closeSession 销账，防止会话提前归零
  const session: DirectPushSession = { title: msg.title, pending: 1, failures: [] }
  try {
    const hits = await evaluateRules(candidateRules, msg, session)
    if (hits.length === 0) {
      return
    }
    for (const rule of hits) {
      // 全局规则命中后才替换，替换只作用于推送副本；按规则算一次供全部渠道复用
      const pushTitle = await applyReplacements(msg.title, rule.title_replace)
      const pushContent = await applyReplacements(msg.content, rule.content_replace)
      // 全局消息队头插入优先发送，失败随会话聚合上报
      for (const link of rule.channels) {
        enqueueDirectPush(
          link.channel,
          { title: pushTitle, content: pushContent },
          { ruleName: rule.name },
          session,
          true,
        )
      }
    }
    // 同一一对一规则可绑定多条命中规则，单条消息只处理一次
    const processedDirectRuleIds = new Set<number>()
    await Promise.allSettled((await loadHitDirectRules(hits.map(rule => rule.id))).map(async (directRule) => {
      if (processedDirectRuleIds.has(directRule.id)) {
        return
      }
      processedDirectRuleIds.add(directRule.id)
      try {
        await processDirectRule(directRule, msg, session)
      }
      catch (e: any) {
        logger.error('[消息中心监控告警] 一对一规则处理异常', {
          directRuleId: directRule.id,
          directRuleName: directRule.name,
          error: e?.message,
        })
      }
    }))
  }
  finally {
    closeSession(session)
  }
}

// 规则内条件并行、规则间分批，峰值正则任务数 = 批大小 × 单规则条件上限，压在 worker 队列上限以内
const RULE_EVAL_BATCH_SIZE = 5

async function evaluateRules(
  rules: Awaited<ReturnType<typeof loadEnabledRules>>,
  msg: messageModel,
  session: DirectPushSession,
): Promise<Awaited<ReturnType<typeof loadEnabledRules>>> {
  const context = { title: msg.title, content: msg.content, category: msg.category, type: msg.type }
  const hits: typeof rules = []
  for (let start = 0; start < rules.length; start += RULE_EVAL_BATCH_SIZE) {
    await Promise.all(rules.slice(start, start + RULE_EVAL_BATCH_SIZE).map(async (rule) => {
      try {
        const result = await evaluateMessageAlertRule(context, {
          logic: rule.logic,
          categories: rule.categories,
          types: rule.types,
          conditions: rule.conditions.map(condition => ({
            mode: condition.mode,
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            sort: condition.sort,
          })),
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
        logger.error('[消息中心监控告警] 规则求值异常', { ruleId: rule.id, ruleName: rule.name, error: e?.message })
        if (rule.channels.length > 0) {
          for (const link of rule.channels) {
            recordSessionFailure(session, {
              ruleName: rule.name,
              channelName: link.channel.name,
              channelType: link.channel.type,
              reason: '规则条件求值超时或异常，未推送',
              content: '',
            })
          }
        }
        else {
          // 仅作一对一触发源的规则没有渠道，规则级记账保证失败可见
          recordSessionFailure(session, {
            ruleName: rule.name,
            channelName: '（一对一触发源）',
            channelType: '-',
            reason: '规则条件求值超时或异常，未推送',
            content: '',
          })
        }
      }
    }))
  }
  return hits
}

// 按渠道聚合命中行：多关键字绑定同一渠道时合并为一次推送，行序按原文还原，行文本去重
async function processDirectRule(
  directRule: Awaited<ReturnType<typeof loadHitDirectRules>>[number],
  msg: messageModel,
  session: DirectPushSession,
) {
  if (directRule.keywords.length === 0) {
    return
  }
  // 内容替换在关键字匹配前对整条消息执行一次，命中行即推送行；执行失败跳过该条替换按原文继续
  const content = await applyReplacements(msg.content, directRule.content_replace)
  const channelLines = new Map<number, { channel: (typeof directRule.keywords)[number]['channels'][number]['channel'], indexes: Map<string, number>, keywords: { keyword: string, receiver: string }[] }>()
  for (const keyword of directRule.keywords) {
    const matched = await matchKeywordLineIndexes(keyword.keyword, keyword.receiver, content)
    if (matched === null) {
      // 匹配超时或异常记入失败会话，静默漏发会让收信人既收不到也无从排查
      for (const link of keyword.channels) {
        recordSessionFailure(session, {
          ruleName: directRule.name,
          channelName: link.channel.name,
          channelType: link.channel.type,
          reason: `关键字匹配超时或异常，收信人「${keyword.receiver || keyword.keyword}」未推送`,
          content: '',
        })
      }
      continue
    }
    if (matched.length === 0) {
      continue
    }
    for (const link of keyword.channels) {
      let entry = channelLines.get(link.channelId)
      if (!entry) {
        entry = { channel: link.channel, indexes: new Map(), keywords: [] }
        channelLines.set(link.channelId, entry)
      }
      if (!entry.keywords.some(item => item.keyword === keyword.keyword && item.receiver === keyword.receiver)) {
        entry.keywords.push({ keyword: keyword.keyword, receiver: keyword.receiver })
      }
      matched.forEach(({ line, index }) => {
        if (!entry.indexes.has(line)) {
          entry.indexes.set(line, index)
        }
      })
    }
  }
  if (channelLines.size === 0) {
    return
  }
  // 标题按渠道渲染（{{keyword}} 各渠道不同），渲染结果去重后替换，避免渠道数百级时重复占用 worker
  const titleCache = new Map<string, string>()
  for (const { channel, indexes, keywords } of channelLines.values()) {
    const orderedLines = [...indexes.entries()].sort((a, b) => a[1] - b[1]).map(([line]) => line)
    const match = truncateMatchedLines(orderedLines)
    const pushContent = match.truncated
      ? `${match.lines.join('\n')}\n……（已截断，共命中 ${match.total} 行）`
      : match.lines.join('\n')
    // {{keyword}} 填充收信人标识，未填时回退正则模式串
    const keywordLabels = [...new Set(keywords.map(({ keyword, receiver }) => receiver || keyword))]
    const renderedTitle = renderDirectTitle(directRule.title_mode as MessageAlertDirectTitleMode, directRule.title_template, msg.title, directRule.name, keywordLabels.join('、'))
    let title = titleCache.get(renderedTitle)
    if (title === undefined) {
      title = await applyReplacements(renderedTitle, directRule.title_replace)
      titleCache.set(renderedTitle, title)
    }
    enqueueDirectPush(
      channel,
      { title, content: pushContent },
      { ruleName: directRule.name },
      session,
    )
  }
}
