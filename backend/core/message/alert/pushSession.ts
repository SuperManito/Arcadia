export interface PushFailure {
  ruleName: string
  channelName: string
  channelType: string
  reason: string
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
  return {
    title,
    pending: 1,
    failures: [],
    onFlush,
  }
}

// channelType 为空表示失败发生在无渠道环节（如一对一触发源），不渲染类型括号
function buildFailureRow({ ruleName, channelName, channelType, reason }: PushFailure) {
  return `- ${ruleName} · ${channelName}${channelType
    ? `（${channelType}）`
    : ''}：${reason}`
}

async function flushSession(session: PushSession) {
  const rows = session.failures.map(buildFailureRow)
  await session.onFlush('告警消息推送失败', `触发消息：${session.title}\n\n${rows.join('\n')}`)
}

function tryFlush(session: PushSession) {
  if (session.pending === 0 && session.failures.length > 0) {
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
