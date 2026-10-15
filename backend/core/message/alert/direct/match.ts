import { logger } from '../../../../utils/logger'
import { matchRegexLines } from '../../../alert'
import { MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER } from './types'

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 模式串中的 {{receiver}} 占位符展开为正则转义后的收信人标识，使同一份模式模板可在多行间机械复用
 */
export function expandReceiverPattern(pattern: string, receiver: string): string {
  if (!pattern.includes(MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER))
    return pattern
  return pattern.split(MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER).join(escapeRegExp(receiver))
}

export type DirectPatternSource = 'receiver' | 'common' | 'identifier'

/**
 * 收信人生效匹配串的三级回退：专属匹配 > 规则通用匹配 > 标识包含匹配；
 * 真实触发与试测共用，返回未展开的模板串
 */
export function resolveReceiverPattern(receiverPattern: string, commonPattern: string): { pattern: string, source: DirectPatternSource } {
  if (receiverPattern)
    return { pattern: receiverPattern, source: 'receiver' }
  if (commonPattern)
    return { pattern: commonPattern, source: 'common' }
  return { pattern: '', source: 'identifier' }
}

export interface DirectMatchReceiver {
  pattern: string
  receiver: string
}

export interface DirectMatchedLine {
  line: string
  index: number
}

export function prepareLines(content: string): DirectMatchedLine[] {
  return content
    .split('\n')
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(item => item.line.length > 0)
}

// 留空 pattern 的收信人在主线程 includes，按批让出事件循环，避免千级名单长时间饿死 HTTP/socket/定时器
const INCLUDES_BATCH_SIZE = 100
// 收信人模式匹配的有限并发：worker 队列上限 200，数千条自定义模式不能一次性全量提交
const PATTERN_MATCH_CONCURRENCY = 4

function yieldEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve))
}

async function matchReceiverPattern(
  pattern: string,
  receiver: string,
  lines: DirectMatchedLine[],
): Promise<DirectMatchedLine[] | null> {
  if (pattern.includes(MESSAGE_ALERT_DIRECT_RECEIVER_PATTERN_PLACEHOLDER) && !receiver) {
    logger.warn('[消息中心监控告警] 收信人模式使用收信人占位符但收信人标识为空，按不命中处理', JSON.stringify({ pattern }))
    return []
  }
  const expanded = expandReceiverPattern(pattern, receiver)
  const results = await matchRegexLines(expanded, lines.map(item => item.line))
  if (results === null) {
    return null
  }
  return lines.filter((_, i) => results[i] === true)
}

/**
 * 一对一收信人匹配的唯一入口（真实触发与试测共用）：
 * 留空 pattern 走主线程 includes 按批让出，填写 pattern 走 worker 有限并发。
 * 返回结果与 receivers 顺序对齐；null 表示超时或异常（区别于零命中），由调用方决定语义
 */
export async function matchDirectRule(
  lines: DirectMatchedLine[],
  receivers: DirectMatchReceiver[],
): Promise<Array<DirectMatchedLine[] | null>> {
  const results: Array<DirectMatchedLine[] | null> = Array.from({ length: receivers.length })
  const patternIndexes: number[] = []
  let includesBatch = 0
  for (let i = 0; i < receivers.length; i++) {
    const { pattern, receiver } = receivers[i]
    if (pattern) {
      patternIndexes.push(i)
      continue
    }
    // 脏数据防御：收信人标识为空时 includes('') 恒真，会把所有行匹配上
    if (!receiver) {
      results[i] = []
      continue
    }
    results[i] = lines.filter(item => item.line.includes(receiver))
    if (++includesBatch >= INCLUDES_BATCH_SIZE) {
      includesBatch = 0
      await yieldEventLoop()
    }
  }
  await mapWithConcurrency(patternIndexes, PATTERN_MATCH_CONCURRENCY, async index => {
    const { pattern, receiver } = receivers[index]
    results[index] = await matchReceiverPattern(pattern, receiver, lines)
  })
  return results
}

// 有限并发遍历，结果与输入顺序对齐
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}
