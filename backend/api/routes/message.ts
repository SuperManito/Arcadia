import type { Express, Request } from 'express'
import type {
  messageAlertDirectRuleReceiverWhereInput,
  messageAlertDirectRuleWhereInput,
  messageAlertRuleWhereInput,
  messageWhereInput,
} from '../../db'
import type { CleanedMessageAlertDirectReceiver, MessageAlertContext } from '../../core/message/alert'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { getUnreadCount, sendUserMessage } from '../../core/message'
import { applyReplacements, parseReplacePairs } from '../../core/alert'
import {
  evaluateMessageAlertRule,
  matchDirectRule,
  MESSAGE_ALERT_DIRECT_RECEIVER_BATCH_MAX_COUNT,
  prepareLines,
  readReceiverOverrides,
  receiverOverridesToResponse,
  refreshEnabledRuleIndex,
  renderDirectTitle,
  resolveReceiverPattern,
  resolveReceiverPushConfig,
  validateMessageAlertDirectReceiver,
  validateMessageAlertDirectReceiverBatchItem,
  validateMessageAlertDirectRulePayload,
  validateMessageAlertRuleDefinition,
  validateMessageAlertRulePayload,
} from '../../core/message/alert'
import {
  MESSAGE_BATCH_ID_MAX_COUNT,
  MESSAGE_CATEGORIES,
  MESSAGE_SEARCH_MAX_LENGTH,
  MESSAGE_TYPES,
  MessageCategory,
  MessageScope,
  MessageType,
} from '../../core/type/message'
import { handleOpenApiError } from '../openapi/openApiCore'

const api: Express = express()
const apiOpen: Express = express()
const apiInner: Express = express()

/**
 * 消息列表查询
 */
async function handleMessageList(request: Request, scope: MessageScope) {
  validatePageFixedParams(request, ['create_time'])

  const where: messageWhereInput = {}
  if (scope === MessageScope.USER) {
    where.category = { equals: MessageCategory.USER }
  }

  // 分类过滤（支持逗号分隔多值，仅 API 生效；OpenAPI 固定 category=user）
  if (scope === MessageScope.ALL && request.query.category) {
    const categories = (request.query.category as string).split(',').map(s => s.trim()).filter(Boolean)
    if (categories.some(c => !(MESSAGE_CATEGORIES as readonly string[]).includes(c))) {
      throw new Error('参数 category 无效（参数值类型错误）')
    }
    if (categories.length === 1) {
      where.category = { equals: categories[0] }
    }
    else if (categories.length > 1) {
      where.category = { in: categories }
    }
  }
  // 消息级别过滤（支持逗号分隔多值）
  if (request.query.type) {
    const types = (request.query.type as string).split(',').map(s => s.trim()).filter(Boolean)
    if (types.some(t => !(MESSAGE_TYPES as readonly string[]).includes(t))) {
      throw new Error('参数 type 无效（参数值类型错误）')
    }
    if (types.length === 1) {
      where.type = { equals: types[0] }
    }
    else if (types.length > 1) {
      where.type = { in: types }
    }
  }
  // 状态过滤
  if (request.query.status) {
    where.status = Number.parseInt(request.query.status as string)
  }
  // 搜索过滤：search 限长，避免超长关键字放大全表扫描
  if (request.query.search) {
    const search = request.query.search as string
    if (search.length > MESSAGE_SEARCH_MAX_LENGTH) {
      throw new Error(`参数 search 长度不能超过 ${MESSAGE_SEARCH_MAX_LENGTH} 个字符`)
    }
    where.AND = {
      OR: [
        { title: { contains: search } },
        { content: { contains: search } },
      ],
    }
  }
  // 排序
  const orderBy = request.query.orderBy as string || 'create_time'
  let desc = true // desc 降序，asc 升序
  if (request.query.order === '0') {
    desc = false // 0 升序，1 降序
  }
  const result = await db.message.$page({
    where,
    orderBy: [{ [orderBy]: desc ? 'desc' : 'asc' }],
    page: String(request.query.page),
    size: String(request.query.size),
  })
  return result
}

/**
 * 消息详情
 */
async function handleMessageDetail(id: number, scope: MessageScope) {
  const message = await db.message.$getById(id)
  if (!message)
    throw new Error('消息不存在')
  if (scope === MessageScope.USER && message.category !== MessageCategory.USER)
    throw new Error('消息不存在')
  return message
}

// 批量端点 id 归一：逐项必须为正整数，数组长度受限
function parseBatchIds(id: unknown): number[] {
  const ids = Array.isArray(id) ? id : [id]
  if (ids.length > MESSAGE_BATCH_ID_MAX_COUNT) {
    throw new Error(`批量操作 id 数量不能超过 ${MESSAGE_BATCH_ID_MAX_COUNT}`)
  }
  return ids.map((value) => {
    const num = Number(value)
    if (!Number.isSafeInteger(num) || num <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    return num
  })
}

/**
 * 标记已读（支持批量和全部）
 */
async function handleMarkRead(ids: number[] | null, scope: MessageScope, status: number) {
  const where: messageWhereInput = { status: status === 1 ? 0 : 1 }
  if (scope === MessageScope.USER)
    where.category = MessageCategory.USER
  if (ids)
    where.id = { in: ids }
  await db.message.updateMany({ where, data: { status } })
}

/**
 * 删除消息
 */
async function handleDelete(ids: number[], scope: MessageScope) {
  const where: messageWhereInput = { id: { in: ids } }
  if (scope === MessageScope.USER)
    where.category = MessageCategory.USER
  await db.message.deleteMany({ where })
}

/**
 * 分页查询
 */
api.get('/list', async (request, response) => {
  try {
    validateRequestParams(request, {
      query: [
        ['category', [false, 'string']],
        ['type', [false, 'string']],
        ['status', [false, ['1', '0']]],
      ],
    })
    const result = await handleMessageList(request, MessageScope.ALL)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取未读消息计数
 */
api.get('/unread/count', async (_request, response) => {
  try {
    const total = await getUnreadCount(MessageScope.ALL)
    response.send(API_STATUS_CODE.okData({ total }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取消息详情
 */
api.get('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const message = await handleMessageDetail(Number.parseInt(id), MessageScope.ALL)
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除消息
 */
api.delete('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    })
    const { id } = params.body
    const ids = parseBatchIds(id)
    await handleDelete(ids, MessageScope.ALL)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新全部消息已读状态
 */
api.put('/status/all', async (request, response) => {
  try {
    validateRequestParams(request, {
      body: [
        ['status', [false, [1, 0]]],
      ] as const,
    })
    const status = request.body.status ?? 1
    await handleMarkRead(null, MessageScope.ALL, status)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新消息已读状态
 */
api.put('/status', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
        ['status', [true, [1, 0]]],
      ] as const,
    })
    const { id, status } = params.body
    const ids = parseBatchIds(id)
    await handleMarkRead(ids, MessageScope.ALL, status)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 清空消息
 */
api.delete('/all', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['status', [false, [1, 0]]],
      ] as const,
    })
    const { status } = params.body
    const where: messageWhereInput = {}
    if (status !== undefined) {
      where.status = status
    }
    const result = await db.message.deleteMany({ where })
    response.send(API_STATUS_CODE.okData({ count: result.count }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 规则分页列表（消息中心抽屉）
 */
api.get('/alert/rule/page', async (request, response) => {
  try {
    validatePageFixedParams(request, ['create_time', 'update_time'])
    validateRequestParams(request, {
      query: [
        ['enabled', [false, ['1', '0']]],
      ],
    })
    const where: messageAlertRuleWhereInput = {}
    const and: messageAlertRuleWhereInput[] = []
    if (request.query.search) {
      and.push({ name: { contains: request.query.search as string } })
    }
    if (request.query.enabled !== undefined) {
      and.push({ enabled: Number.parseInt(request.query.enabled as string) })
    }
    if (and.length > 0) {
      where.AND = and
    }
    const orderBy = request.query.orderBy as string || 'id'
    const desc = request.query.order !== '0'
    const result = await db.messageAlertRule.$page({
      where,
      orderBy: [{ [orderBy]: desc ? 'desc' : 'asc' }],
      page: String(request.query.page),
      size: String(request.query.size),
    })
    const data = (result.data as Array<any>).map(row => ({
      ...row,
      // 替换列落库为 JSON 数组串，对外统一返回数组
      replaces: parseReplacePairs(row.replaces),
    }))
    response.send(API_STATUS_CODE.okData({ ...result, data }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 规则详情
 */
api.get('/alert/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const rule = await db.messageAlertRule.$getById(Number.parseInt(id), 'id', {
      include: {
        conditions: { select: { mode: true, field: true, operator: true, value: true }, orderBy: { sort: 'asc' } },
        channels: { select: { channelId: true } },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const { conditions, channels, ...rest } = rule
    response.send(API_STATUS_CODE.okData({
      ...rest,
      replaces: parseReplacePairs(rest.replaces),
      conditions,
      channels,
    }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 新建规则
 */
api.post('/alert/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [false, 'string']],
        ['enabled', [true, [1, 0]]],
        ['logic', [false, 'string']],
        ['categories', [false, 'string', true]],
        ['types', [false, 'string', true]],
        ['conditions', [false, 'object[]']],
        ['channelIds', [false, 'number[]']],
        ['replaces', [false, 'object[]']],
        ['titleMerge', [false, 'number']],
      ] as const,
    }, true)
    const { enabled } = params.body
    const cleaned = await validateMessageAlertRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.messageAlertRule.$create({
        name: cleaned.name,
        enabled,
        logic: cleaned.logic,
        categories: cleaned.categories,
        types: cleaned.types,
        replaces: cleaned.replaces,
        title_merge: cleaned.titleMerge,
      })
      await tx.messageAlertRuleCondition.createMany({
        data: cleaned.conditions.map((condition, index) => ({
          messageAlertRuleId: created.id,
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          sort: index,
        })),
      })
      await tx.messageAlertRuleChannel.createMany({
        data: cleaned.channelIds.map(channelId => ({
          messageAlertRuleId: created.id,
          channelId,
        })),
      })
      return created
    })
    await refreshEnabledRuleIndex()
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新规则（条件整体替换；渠道关联仅在显式提供 channelIds 时替换；仅提供 id 与 enabled 时为快速启停）
 */
api.put('/alert/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['enabled', [false, [1, 0]]],
        ['name', [false, 'string']],
        ['logic', [false, 'string']],
        ['categories', [false, 'string', true]],
        ['types', [false, 'string', true]],
        ['conditions', [false, 'object[]']],
        ['channelIds', [false, 'number[]']],
        ['replaces', [false, 'object[]']],
        ['titleMerge', [false, 'number']],
      ] as const,
    }, true)
    const {
      id,
      enabled,
      name,
      logic,
      categories,
      types,
      conditions,
      channelIds,
      replaces,
      titleMerge,
    } = params.body
    const exists = await db.messageAlertRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    if (enabled !== undefined && [
      name,
      logic,
      categories,
      types,
      conditions,
      channelIds,
      replaces,
      titleMerge,
    ].every(field => field === undefined)) {
      const rule = await db.messageAlertRule.$updateById({ id, data: { enabled } })
      await refreshEnabledRuleIndex()
      response.send(API_STATUS_CODE.okData(rule))
      return
    }
    const cleaned = await validateMessageAlertRulePayload(params.body, { excludeId: id })
    const rule = await db.$transaction(async (tx) => {
      const updated = await tx.messageAlertRule.$updateById({
        id,
        data: {
          name: cleaned.name,
          logic: cleaned.logic,
          categories: cleaned.categories,
          types: cleaned.types,
          replaces: cleaned.replaces,
          title_merge: cleaned.titleMerge,
          ...(enabled !== undefined ? { enabled } : {}),
        },
      })
      await tx.messageAlertRuleCondition.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRuleCondition.createMany({
        data: cleaned.conditions.map((condition, index) => ({
          messageAlertRuleId: id,
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          sort: index,
        })),
      })
      // 未显式提供 channelIds 时保留原关联；清空需显式传空数组，避免整存漏传被静默清空
      if (channelIds !== undefined) {
        await tx.messageAlertRuleChannel.deleteMany({ where: { messageAlertRuleId: id } })
        await tx.messageAlertRuleChannel.createMany({
          data: cleaned.channelIds.map(channelId => ({
            messageAlertRuleId: id,
            channelId,
          })),
        })
      }
      return updated
    })
    await refreshEnabledRuleIndex()
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除规则（事务内先删关联、再删条件、最后删规则）
 */
api.delete('/alert/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ] as const,
    })
    const { id } = params.body
    const exists = await db.messageAlertRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    // 一对一规则可能绑定本规则，静默解绑会让用户无从发现一对一规则失效
    const boundCount = await db.messageAlertDirectRuleBinding.count({ where: { alertRuleId: id } })
    if (boundCount > 0) {
      throw new Error(`该规则被 ${boundCount} 条一对一规则绑定，请先解除绑定`)
    }
    await db.$transaction(async (tx) => {
      await tx.messageAlertRuleChannel.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRuleCondition.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRule.$deleteById(id)
    })
    await refreshEnabledRuleIndex()
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 规则命中测试（不落库、不发送）
 */
api.post('/alert/rule/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['rule', [true, 'object']],
        ['message', [true, 'object']],
      ] as const,
    })
    const { rule, message } = params.body
    const cleanedRule = validateMessageAlertRuleDefinition(rule)

    const title = typeof message.title === 'string' ? message.title.trim() : ''
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (!title && !content) {
      throw new Error('测试消息的标题与内容至少填写一项')
    }
    const msg: MessageAlertContext = {
      title,
      content,
      category: typeof message.category === 'string' ? message.category : '',
      type: typeof message.type === 'string' ? message.type : '',
    }
    const result = await evaluateMessageAlertRule(msg, {
      logic: cleanedRule.logic,
      categories: cleanedRule.categories,
      types: cleanedRule.types,
      conditions: cleanedRule.conditions,
    })
    // 求值失败时 matched 无意义，直接报错而不是显示成未命中
    if (result.failed) {
      throw new Error('规则条件求值超时或异常，请稍后重试')
    }
    response.send(API_STATUS_CODE.okData({
      matched: result.matched,
      conditions: result.conditions.map(({ sort, matched }) => ({ sort, matched })),
    }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 一对一规则分页列表
 */
api.get('/alert/direct/rule/page', async (request, response) => {
  try {
    validatePageFixedParams(request, ['create_time', 'update_time'])
    validateRequestParams(request, {
      query: [
        ['enabled', [false, ['1', '0']]],
      ],
    })
    const where: messageAlertDirectRuleWhereInput = {}
    const and: messageAlertDirectRuleWhereInput[] = []
    if (request.query.search) {
      and.push({ name: { contains: request.query.search as string } })
    }
    if (request.query.enabled !== undefined) {
      and.push({ enabled: Number.parseInt(request.query.enabled as string) })
    }
    if (and.length > 0) {
      where.AND = and
    }
    const orderBy = request.query.orderBy as string || 'id'
    const desc = request.query.order !== '0'
    const result = await db.messageAlertDirectRule.$page({
      where,
      orderBy: [{ [orderBy]: desc ? 'desc' : 'asc' }],
      page: String(request.query.page),
      size: String(request.query.size),
      include: {
        _count: { select: { receivers: true } },
      },
    })
    const data = (result.data as Array<any>).map(({ _count, ...rest }) => ({
      ...rest,
      pre_replaces: parseReplacePairs(rest.pre_replaces),
      post_replaces: parseReplacePairs(rest.post_replaces),
      receiver_count: _count?.receivers ?? 0,
    }))
    response.send(API_STATUS_CODE.okData({ ...result, data }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 规则全量精简列表（一对一规则绑定选择）
 */
api.get('/alert/rule/list', async (_request, response) => {
  try {
    const result = await db.messageAlertRule.$list(
      { orderBy: { id: 'asc' } },
      { select: { id: true, name: true, enabled: true } },
    )
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 一对一规则详情（不含收信人，名单走独立分页接口）
 */
api.get('/alert/direct/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const rule = await db.messageAlertDirectRule.$getById(Number.parseInt(id), 'id', {
      include: {
        bindings: { select: { alertRuleId: true } },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const { bindings, ...rest } = rule
    response.send(API_STATUS_CODE.okData({
      ...rest,
      pre_replaces: parseReplacePairs(rest.pre_replaces),
      post_replaces: parseReplacePairs(rest.post_replaces),
      alert_rule_ids: bindings.map(link => link.alertRuleId),
    }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 新建一对一规则
 */
api.post('/alert/direct/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [false, 'string']],
        ['enabled', [true, [1, 0]]],
        ['titleMode', [false, 'string']],
        ['titleTemplate', [false, 'string']],
        ['titleMerge', [false, 'number']],
        ['channelMerge', [false, 'number']],
        ['preReplaces', [false, 'object[]']],
        ['postReplaces', [false, 'object[]']],
        ['commonPattern', [false, 'string']],
        ['alertRuleIds', [false, 'number[]']],
      ] as const,
    }, true)
    const { enabled } = params.body
    const cleaned = await validateMessageAlertDirectRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.messageAlertDirectRule.$create({
        name: cleaned.name,
        enabled,
        title_mode: cleaned.titleMode,
        title_template: cleaned.titleTemplate,
        title_merge: cleaned.titleMerge,
        channel_merge: cleaned.channelMerge,
        pre_replaces: cleaned.preReplaces,
        post_replaces: cleaned.postReplaces,
        common_pattern: cleaned.commonPattern,
      })
      await tx.messageAlertDirectRuleBinding.createMany({
        data: cleaned.alertRuleIds.map(alertRuleId => ({
          alertRuleId,
          directRuleId: created.id,
        })),
      })
      return created
    })
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新一对一规则主体（全局规则绑定仅在显式提供 ruleIds 时替换；仅提供 id 与 enabled 时为快速启停）；收信人由独立端点维护
 */
api.put('/alert/direct/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['enabled', [false, [1, 0]]],
        ['name', [false, 'string']],
        ['titleMode', [false, 'string']],
        ['titleTemplate', [false, 'string']],
        ['titleMerge', [false, 'number']],
        ['channelMerge', [false, 'number']],
        ['preReplaces', [false, 'object[]']],
        ['postReplaces', [false, 'object[]']],
        ['commonPattern', [false, 'string']],
        ['alertRuleIds', [false, 'number[]']],
      ] as const,
    }, true)
    const {
      id,
      enabled,
      name,
      titleMode,
      titleTemplate,
      titleMerge,
      channelMerge,
      preReplaces,
      postReplaces,
      commonPattern,
      alertRuleIds,
    } = params.body
    const exists = await db.messageAlertDirectRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    if (enabled !== undefined && [
      name,
      titleMode,
      titleTemplate,
      titleMerge,
      channelMerge,
      preReplaces,
      postReplaces,
      commonPattern,
      alertRuleIds,
    ].every(field => field === undefined)) {
      const rule = await db.messageAlertDirectRule.$updateById({ id, data: { enabled } })
      response.send(API_STATUS_CODE.okData(rule))
      return
    }
    const cleaned = await validateMessageAlertDirectRulePayload(params.body, { excludeId: id })
    const rule = await db.$transaction(async (tx) => {
      const updated = await tx.messageAlertDirectRule.$updateById({
        id,
        data: {
          name: cleaned.name,
          title_mode: cleaned.titleMode,
          title_template: cleaned.titleTemplate,
          title_merge: cleaned.titleMerge,
          channel_merge: cleaned.channelMerge,
          pre_replaces: cleaned.preReplaces,
          post_replaces: cleaned.postReplaces,
          common_pattern: cleaned.commonPattern,
          ...(enabled !== undefined ? { enabled } : {}),
        },
      })
      // 未显式提供 alertRuleIds 时保留原绑定；清空需显式传空数组，避免整存漏传被静默清空
      if (alertRuleIds !== undefined) {
        await tx.messageAlertDirectRuleBinding.deleteMany({ where: { directRuleId: id } })
        await tx.messageAlertDirectRuleBinding.createMany({
          data: cleaned.alertRuleIds.map(alertRuleId => ({
            alertRuleId,
            directRuleId: id,
          })),
        })
      }
      return updated
    })
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 收信人名单分页（搜索覆盖收信人标识/备注/渠道名）
 */
api.get('/alert/direct/rule/receiver/page', async (request, response) => {
  try {
    validatePageFixedParams(request, ['receiver', 'update_time'])
    const params = validateRequestParams(request, {
      query: [
        ['ruleId', [true, 'string']],
        ['enabled', [false, ['1', '0']]],
      ] as const,
    })
    const { ruleId, enabled } = params.query
    if (!/^\d+$/.test(ruleId) || Number.parseInt(ruleId) <= 0) {
      throw new Error('参数 ruleId 无效（参数值类型错误）')
    }
    const rule = await db.messageAlertDirectRule.$getById(Number.parseInt(ruleId), 'id', { select: { id: true } })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const where: messageAlertDirectRuleReceiverWhereInput = { directRuleId: Number.parseInt(ruleId) }
    if (request.query.search) {
      const search = request.query.search as string
      where.OR = [
        { receiver: { contains: search } },
        { remark: { contains: search } },
        { channels: { some: { channel: { name: { contains: search } } } } },
      ]
    }
    if (enabled !== undefined) {
      where.enabled = Number.parseInt(enabled)
    }
    const orderBy = request.query.orderBy as string || 'id'
    const desc = request.query.order !== '0'
    const result = await db.messageAlertDirectRuleReceiver.$page({
      where,
      orderBy: [{ [orderBy]: desc ? 'desc' : 'asc' }],
      page: String(request.query.page),
      size: String(request.query.size),
      include: { channels: { select: { channel: { select: { id: true, name: true } } } } },
    })
    const data = (result.data as Array<any>).map(({ channels, overrides, directRuleId, ...rest }) => ({
      ...rest,
      overrides: receiverOverridesToResponse(overrides),
      channels: channels.map((link: any) => link.channel),
    }))
    response.send(API_STATUS_CODE.okData({ ...result, data }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 收信人标识同规则内唯一查重（冲突转友好文案，唯一约束兜底并发）
 */
async function assertDirectReceiverUnique(directRuleId: number, receiver: string, excludeId?: number) {
  const duplicated = await db.messageAlertDirectRuleReceiver.findFirst({
    where: {
      directRuleId,
      receiver,
      ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })
  if (duplicated) {
    throw new Error('该规则内已存在同名收信人标识')
  }
}

async function assertChannelsExist(channelIds: number[]) {
  if (channelIds.length === 0) {
    return
  }
  const channels = await db.notificationChannel.$list(
    { where: { id: { in: channelIds } } },
    { select: { id: true } },
  )
  if (channels.length !== channelIds.length) {
    throw new Error('渠道不存在')
  }
}

/**
 * 新增单个收信人
 */
api.post('/alert/direct/rule/receiver', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['ruleId', [true, 'number']],
        ['receiver', [true, 'string']],
        ['overrides', [false, 'object']],
        ['remark', [false, 'string']],
        ['enabled', [false, [1, 0]]],
        ['channelIds', [false, 'number[]']],
      ] as const,
    }, true)
    const { ruleId } = params.body
    const rule = await db.messageAlertDirectRule.$getById(ruleId, 'id', { select: { id: true } })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const cleaned = validateMessageAlertDirectReceiver(params.body)
    await assertDirectReceiverUnique(ruleId, cleaned.receiver)
    await assertChannelsExist(cleaned.channelIds)
    const created = await db.$transaction(async (tx) => {
      const row = await tx.messageAlertDirectRuleReceiver.$create({
        directRuleId: ruleId,
        receiver: cleaned.receiver,
        overrides: cleaned.overrides,
        remark: cleaned.remark,
        enabled: cleaned.enabled,
      })
      if (cleaned.channelIds.length > 0) {
        await tx.messageAlertDirectRuleReceiverChannel.createMany({
          data: cleaned.channelIds.map(channelId => ({ receiverId: row.id, channelId })),
        })
      }
      return row
    })
    response.send(API_STATUS_CODE.okData(created))
  }
  catch (e: any) {
    // 唯一约束兜底并发下的查重竞态
    if (e?.code === 'P2002') {
      response.send(API_STATUS_CODE.fail('收信人标识已存在'))
      return
    }
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改收信人（仅传 id 与 enabled 为行内启停，其余字段按全量提交）
 */
api.put('/alert/direct/rule/receiver', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['enabled', [true, [1, 0]]],
        ['receiver', [false, 'string']],
        ['overrides', [false, 'object']],
        ['remark', [false, 'string']],
        ['channelIds', [false, 'number[]']],
      ] as const,
    }, true)
    const { id, receiver, overrides, remark, enabled, channelIds } = params.body
    const exists = await db.messageAlertDirectRuleReceiver.$getById(id)
    if (!exists) {
      throw new Error('收信人不存在')
    }
    if ([receiver, overrides, remark, channelIds].every(field => field === undefined)) {
      if (enabled === 1) {
        const channelCount = await db.messageAlertDirectRuleReceiverChannel.count({ where: { receiverId: id } })
        if (channelCount === 0) {
          throw new Error('收信人未关联通知渠道，不能启用')
        }
      }
      const updated = await db.messageAlertDirectRuleReceiver.$updateById({ id, data: { enabled } })
      response.send(API_STATUS_CODE.okData(updated))
      return
    }
    const cleaned = validateMessageAlertDirectReceiver({ receiver, overrides, remark, enabled, channelIds })
    await assertDirectReceiverUnique(exists.directRuleId, cleaned.receiver, id)
    await assertChannelsExist(cleaned.channelIds)
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.messageAlertDirectRuleReceiver.$updateById({
        id,
        data: {
          receiver: cleaned.receiver,
          overrides: cleaned.overrides,
          remark: cleaned.remark,
          enabled: cleaned.enabled,
        },
      })
      await tx.messageAlertDirectRuleReceiverChannel.deleteMany({ where: { receiverId: id } })
      if (cleaned.channelIds.length > 0) {
        await tx.messageAlertDirectRuleReceiverChannel.createMany({
          data: cleaned.channelIds.map(channelId => ({ receiverId: id, channelId })),
        })
      }
      return row
    })
    response.send(API_STATUS_CODE.okData(updated))
  }
  catch (e: any) {
    // 唯一约束兜底并发下的查重竞态
    if (e?.code === 'P2002') {
      response.send(API_STATUS_CODE.fail('收信人标识已存在'))
      return
    }
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 批量启停收信人：启用沿用单条启停约束，未关联通知渠道的行自动跳过
 */
api.put('/alert/direct/rule/receiver/status', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['ids', [true, 'number[]']],
        ['enabled', [true, [1, 0]]],
      ] as const,
    }, true)
    const { ids, enabled } = params.body
    if (ids.length === 0) {
      throw new Error('参数 ids 不能为空')
    }
    // 启用要求收信人已绑定通知渠道，未绑定的行保持原状
    const result = await db.messageAlertDirectRuleReceiver.updateMany({
      where: enabled === 1
        ? { id: { in: ids }, channels: { some: {} } }
        : { id: { in: ids } },
      data: { enabled },
    })
    response.send(API_STATUS_CODE.okData({ count: result.count }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 批量删除收信人
 */
api.delete('/alert/direct/rule/receiver', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['ruleId', [true, 'number']],
        ['ids', [true, 'number[]']],
      ] as const,
    }, true)
    const { ruleId, ids } = params.body
    const rule = await db.messageAlertDirectRule.$getById(ruleId, 'id', { select: { id: true } })
    if (!rule) {
      throw new Error('规则不存在')
    }
    if (ids.length === 0) {
      throw new Error('参数 ids 不能为空')
    }
    // 先删渠道关联再删行
    await db.$transaction(async (tx) => {
      await tx.messageAlertDirectRuleReceiverChannel.deleteMany({ where: { receiverId: { in: ids }, receiver: { directRuleId: ruleId } } })
      await tx.messageAlertDirectRuleReceiver.deleteMany({ where: { id: { in: ids }, directRuleId: ruleId } })
    })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 批量添加收信人：条目只带名单内容，写入一律禁用且不含渠道；逐条校验、合法项入库，失败项连同原因返回
 */
api.post('/alert/direct/rule/receiver/batch', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['ruleId', [true, 'number']],
        ['receivers', [true, 'object[]']],
      ] as const,
    }, true)
    const { ruleId, receivers } = params.body
    const rule = await db.messageAlertDirectRule.$getById(ruleId, 'id', { select: { id: true } })
    if (!rule) {
      throw new Error('规则不存在')
    }
    if (receivers.length === 0) {
      throw new Error('参数 receivers 不能为空')
    }
    if (receivers.length > MESSAGE_ALERT_DIRECT_RECEIVER_BATCH_MAX_COUNT) {
      throw new Error(`单次最多添加 ${MESSAGE_ALERT_DIRECT_RECEIVER_BATCH_MAX_COUNT} 个收信人`)
    }
    const failed: Array<{ receiver: string, reason: string }> = []
    const valid: CleanedMessageAlertDirectReceiver[] = []
    for (const [index, item] of receivers.entries()) {
      try {
        valid.push(validateMessageAlertDirectReceiverBatchItem(item))
      }
      catch (e: any) {
        failed.push({ receiver: typeof item?.receiver === 'string' ? item.receiver.trim() : '', reason: `第 ${index + 1} 项：${e.message}` })
      }
    }
    // 载荷内重复：首项有效，后续计失败
    const seen = new Set<string>()
    const unique: CleanedMessageAlertDirectReceiver[] = []
    for (const item of valid) {
      if (seen.has(item.receiver)) {
        failed.push({ receiver: item.receiver, reason: '收信人标识在本次提交中重复' })
        continue
      }
      seen.add(item.receiver)
      unique.push(item)
    }
    // 库内同名收信人计失败，合法项单事务批量落库
    const existedReceivers = unique.length > 0
      ? new Set((await db.messageAlertDirectRuleReceiver.$list(
          { where: { directRuleId: ruleId, receiver: { in: unique.map(item => item.receiver) } } },
          { select: { receiver: true } },
        )).map(row => row.receiver))
      : new Set<string>()
    const toCreate = unique.filter(item => !existedReceivers.has(item.receiver))
    for (const receiver of existedReceivers) {
      failed.push({ receiver, reason: '该规则内已存在同名收信人标识' })
    }
    let created = 0
    if (toCreate.length > 0) {
      await db.messageAlertDirectRuleReceiver.createMany({
        data: toCreate.map(({ receiver, overrides, remark, enabled }) => ({ directRuleId: ruleId, receiver, overrides, remark, enabled })),
      })
      created = toCreate.length
    }
    response.send(API_STATUS_CODE.okData({ created, failed }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 导出整份收信人名单（不含渠道与启用状态；唯一允许全量返回的接口）
 */
api.get('/alert/direct/rule/receiver/export', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['ruleId', [true, 'string']],
      ] as const,
    })
    const { ruleId } = params.query
    if (!/^\d+$/.test(ruleId) || Number.parseInt(ruleId) <= 0) {
      throw new Error('参数 ruleId 无效（参数值类型错误）')
    }
    const rule = await db.messageAlertDirectRule.$getById(Number.parseInt(ruleId), 'id', { select: { id: true } })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const receivers = await db.messageAlertDirectRuleReceiver.$list(
      { where: { directRuleId: Number.parseInt(ruleId) }, orderBy: { id: 'asc' } },
      { select: { receiver: true, overrides: true, remark: true } },
    )
    // 导出与批量添加共用同一对象结构，overrides 键名与推送自定义接口一致
    response.send(API_STATUS_CODE.okData({
      receivers: receivers.map(({ receiver, overrides, remark }) => ({
        receiver,
        overrides: receiverOverridesToResponse(overrides),
        remark,
      })),
    }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除一对一规则（绑定自动解除；仍有收信人则拒绝）
 */
api.delete('/alert/direct/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ] as const,
    })
    const { id } = params.body
    const exists = await db.messageAlertDirectRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    // 收信人是用户逐行维护的名单，随规则静默清空会造成不可恢复的数据丢失
    const receiverCount = await db.messageAlertDirectRuleReceiver.count({ where: { directRuleId: id } })
    if (receiverCount > 0) {
      throw new Error('该规则仍有收信人，请先删除全部收信人')
    }
    await db.$transaction(async (tx) => {
      await tx.messageAlertDirectRuleBinding.deleteMany({ where: { directRuleId: id } })
      await tx.messageAlertDirectRuleReceiverChannel.deleteMany({ where: { receiver: { directRuleId: id } } })
      await tx.messageAlertDirectRuleReceiver.deleteMany({ where: { directRuleId: id } })
      await tx.messageAlertDirectRule.$deleteById(id)
    })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 收信人命中测试（不落库、不发送）：继承规则的替换、通用匹配与标题配置，按真实推送语义预览单收信人结果
 */
api.post('/alert/direct/rule/receiver/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['message', [true, 'object']],
      ] as const,
    })
    const { id, message } = params.body
    const receiver = await db.messageAlertDirectRuleReceiver.$getById(id)
    if (!receiver) {
      throw new Error('收信人不存在')
    }
    const rule = await db.messageAlertDirectRule.$getById(receiver.directRuleId)
    if (!rule) {
      throw new Error('规则不存在')
    }
    const title = typeof message.title === 'string' ? message.title.trim() : ''
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (!title && !content) {
      throw new Error('测试消息的标题与内容至少填写一项')
    }
    // 替换与真实推送一致：内容替换先于收信人匹配执行，命中行再经匹配后替换清洗
    const replacedContent = await applyReplacements(content, rule.pre_replaces, 'content')
    const lines = prepareLines(replacedContent)
    const overrides = readReceiverOverrides(receiver.overrides)
    const pushConfig = resolveReceiverPushConfig(overrides, rule)
    const { pattern, source } = resolveReceiverPattern(overrides.pattern ?? '', rule.common_pattern)
    const [matched] = await matchDirectRule(lines, [{ pattern, receiver: receiver.receiver }])
    // 超时或异常与未命中语义不同，试测需明确报错而不是显示成未命中
    if (matched === null) {
      throw new Error(`收信人「${receiver.receiver}」匹配超时或异常，请稍后重试`)
    }
    // 匹配后替换按命中行逐条执行，去重与清空行跳过同真实推送的渠道内聚合
    const testVars = { title, rule: rule.name, receiver: receiver.receiver }
    const replacedLines: string[] = []
    for (const { line } of matched) {
      const replaced = (await applyReplacements(line, pushConfig.postReplaces, 'content', testVars)).trim()
      if (replaced && !replacedLines.includes(replaced)) {
        replacedLines.push(replaced)
      }
    }
    response.send(API_STATUS_CODE.okData({
      matched: replacedLines.length > 0,
      title: replacedLines.length > 0
        ? await applyReplacements(
            await applyReplacements(
              renderDirectTitle(
                pushConfig.titleMode,
                pushConfig.titleTemplate,
                title,
                rule.name,
                receiver.receiver,
              ),
              rule.pre_replaces,
              'title',
            ),
            pushConfig.postReplaces,
            'title',
            testVars,
          )
        : '',
      content: replacedLines.join('\n'),
      pattern_source: source,
    }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 推送消息（OpenAPI）
 */
apiOpen.post('/v1/create', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['title', [true, 'string']],
        ['content', [true, 'string']],
        ['type', [false, Object.values(MessageType)]],
      ] as const,
    })
    const { title, content, type } = params.body
    await sendUserMessage({ title, content, type: type as MessageType })
    response.send(API_STATUS_CODE.okData({ count: 1 }))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 推送消息')
  }
})

/**
 * 分页查询消息（OpenAPI）
 */
apiOpen.get('/v1/list', async (request, response) => {
  try {
    validateRequestParams(request, {
      query: [
        ['type', [false, 'string']],
        ['status', [false, ['1', '0']]],
      ],
    })
    const result = await handleMessageList(request, MessageScope.USER)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 分页查询消息')
  }
})

/**
 * 获取未读消息计数（OpenAPI）
 */
apiOpen.get('/v1/unreadCount', async (_request, response) => {
  try {
    const total = await getUnreadCount(MessageScope.USER)
    response.send(API_STATUS_CODE.okData({ total }))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 获取未读消息计数')
  }
})

/**
 * 获取消息详情（OpenAPI）
 */
apiOpen.get('/v1/detail', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const message = await handleMessageDetail(Number.parseInt(id), MessageScope.USER)
    response.send(API_STATUS_CODE.okData(message))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 获取消息详情')
  }
})

/**
 * 批量标记消息已读（OpenAPI）
 */
apiOpen.post('/v1/readStatus', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
        ['status', [true, [1, 0]]],
      ] as const,
    })
    const { id, status } = params.body
    const ids = parseBatchIds(id)
    await handleMarkRead(ids, MessageScope.USER, status)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 标记消息已读')
  }
})

/**
 * 全部标记已读（OpenAPI）
 */
apiOpen.post('/v1/readAll', async (request, response) => {
  try {
    validateRequestParams(request, {
      body: [
        ['status', [false, [1, 0]]],
      ] as const,
    })
    const status = request.body.status ?? 1
    await handleMarkRead(null, MessageScope.USER, status)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 全部标记已读')
  }
})

/**
 * 删除消息（OpenAPI）
 */
apiOpen.post('/v1/delete', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    })
    const { id } = params.body
    const ids = parseBatchIds(id)
    await handleDelete(ids, MessageScope.USER)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Message] 删除消息')
  }
})

/**
 * 推送消息（Inner API，仅本地访问）
 */
apiInner.post('/push', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['title', [true, 'string']],
        ['content', [true, 'string']],
        ['type', [false, Object.values(MessageType)]],
      ] as const,
    })
    const { title, content, type } = params.body
    await sendUserMessage({ title, content, type: type as MessageType })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export {
  api as API,
  apiInner as InnerAPI,
  apiOpen as OpenAPI,
}
