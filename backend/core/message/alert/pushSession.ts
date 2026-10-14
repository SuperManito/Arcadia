import { logger } from '../../../utils/logger'

// sendMessage 入库按 20000 字符截断，汇总按低于该值的行数分片写多条
const SUMMARY_CONTENT_MAX_LENGTH = 19000

// 全局规则行携带整条正文，批量失败时行体积线性放大分片数，只保留前缀供识别，原文见触发消息
const SUMMARY_ROW_CONTENT_MAX_LENGTH = 200

export interface PushFailure {
  ruleName: string
  channelName: string
  channelType: string
  reason: string
  content: string
}

/**
 * 同一条触发消息的推送失败汇总会话：任务落定逐个销账，pending 归零且存在失败时经 onFlush 写汇总消息
 * pending 初值 1 为封口哨兵，防止先入队的失败在后续任务尚未入队前提前归零 flush 出多条汇总
 */
export interface PushSession {
  title: string
  pending: number
  failures: PushFailure[]
  /** 失败汇总的落库出口由调用方注入，本模块不反向依赖消息入库 */
  onFlush: (title: string, content: string) => Promise<unknown>
}

export function createPushSession(title: string, onFlush: PushSession['onFlush']): PushSession {
  return { title, pending: 1, failures: [], onFlush }
}

// md 表格单元格物理上不能含换行与竖线，写入前统一转换
function toCell(text: string) {
  return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')
}

export function truncateSummaryContent(content: string) {
  return content.length > SUMMARY_ROW_CONTENT_MAX_LENGTH
    ? `${content.slice(0, SUMMARY_ROW_CONTENT_MAX_LENGTH)}……（截断，原文见触发消息）`
    : content
}

function buildSummaryContent(session: PushSession, rows: string[]) {
  return `触发消息：${session.title}\n\n| 规则 | 渠道 | 原因 | 原推送内容 |\n| --- | --- | --- | --- |\n${rows.join('\n')}`
}

// 失败渠道与原因取前若干个做日志样本，全量明细见汇总消息
const LOG_FAILURE_SAMPLES = 5

// 按消息入库截断上限分片，避免表格尾部行丢失；每片独立一条汇总消息
async function flushSession(session: PushSession) {
  // 每个失败会话只写一条日志：百级渠道整类失败时逐条日志会形成洪水
  logger.warn('[消息中心监控告警] 推送存在失败', JSON.stringify({
    triggerTitle: session.title,
    failureCount: session.failures.length,
    samples: session.failures.slice(0, LOG_FAILURE_SAMPLES).map(({ channelName, reason }) => `${channelName}: ${reason}`),
  }))
  const rows = session.failures.map(({ ruleName, channelName, channelType, reason, content }) =>
    `| ${toCell(ruleName)} | ${toCell(channelName)}（${channelType}） | ${toCell(reason)} | ${toCell(content)} |`)
  const header = buildSummaryContent(session, [])
  const chunks: string[][] = [[]]
  let length = header.length
  for (const row of rows) {
    if (length + row.length + 1 > SUMMARY_CONTENT_MAX_LENGTH && chunks[chunks.length - 1].length > 0) {
      chunks.push([])
      length = header.length
    }
    chunks[chunks.length - 1].push(row)
    length += row.length + 1
  }
  await Promise.all(chunks.map((chunk, index) => session.onFlush(
    chunks.length > 1 ? `告警消息推送失败（${index + 1}/${chunks.length}）` : '告警消息推送失败',
    buildSummaryContent(session, chunk),
  )))
}

function tryFlush(session: PushSession) {
  if (session.pending === 0 && session.failures.length > 0) {
    // 汇总消息内容在首个 await 前同步组装，与后续新入队任务互不干扰
    void flushSession(session).catch(() => {})
  }
}

/**
 * 任务落定销账：可选携带失败行，pending 归零且存在失败时触发汇总
 */
export function settleSession(session: PushSession, failure?: PushFailure) {
  if (failure) {
    session.failures.push(failure)
  }
  session.pending--
  tryFlush(session)
}

/**
 * 匹配阶段失败（如关键字正则执行异常）没有对应推送任务，直接记入失败会话随汇总上报
 */
export function recordSessionFailure(session: PushSession, failure: PushFailure) {
  session.failures.push(failure)
}

/**
 * 处理链路结束时的封口：销掉哨兵名额，归零后按条件 flush
 */
export function closeSession(session: PushSession) {
  session.pending--
  tryFlush(session)
}
