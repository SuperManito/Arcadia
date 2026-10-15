import type { Express, Request } from 'express'
import type {
  messageAlertDirectRuleReceiverWhereInput,
  messageAlertDirectRuleWhereInput,
  messageAlertRuleWhereInput,
  messageWhereInput,
} from '../../db'
import type { MessageAlertContext, MessageAlertDirectTitleMode } from '../../core/message/alert'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { getUnreadCount, sendUserMessage } from '../../core/message'
import { applyReplacements } from '../../core/alert'
import {
  evaluateMessageAlertRule,
  matchDirectRule,
  MESSAGE_ALERT_DIRECT_RECEIVER_DELETE_MAX_COUNT,
  MESSAGE_ALERT_DIRECT_RECEIVER_IMPORT_MAX_COUNT,
  prepareLines,
  refreshEnabledRuleIndex,
  renderDirectTitle,
  validateMessageAlertDirectReceiver,
  validateMessageAlertDirectReceiverImportItem,
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
    validatePageFixedParams(request, ['id', 'name', 'create_time', 'update_time'])
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
      include: { _count: { select: { channels: true } } },
    })
    const data = (result.data as Array<any>).map(({ _count, ...rest }) => ({
      ...rest,
      channel_count: _count?.channels ?? 0,
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
        conditions: { orderBy: { sort: 'asc' } },
        channels: { include: { channel: true } },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const { conditions, channels, ...rest } = rule
    response.send(API_STATUS_CODE.okData({
      ...rest,
      conditions,
      channels: channels.map(link => ({
        id: link.id,
        channelId: link.channelId,
        name: link.channel.name,
        type: link.channel.type,
      })),
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
        ['logic', [false, 'string']],
        ['categories', [false, 'string', true]],
        ['types', [false, 'string', true]],
        ['conditions', [false, 'object[]']],
        ['channelIds', [false, 'number[]']],
        ['contentReplace', [false, 'string']],
        ['titleReplace', [false, 'string']],
      ] as const,
    }, true)
    const cleaned = await validateMessageAlertRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.messageAlertRule.$create({
        name: cleaned.name,
        logic: cleaned.logic,
        categories: cleaned.categories,
        types: cleaned.types,
        content_replace: cleaned.contentReplace,
        title_replace: cleaned.titleReplace,
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
        ['contentReplace', [false, 'string']],
        ['titleReplace', [false, 'string']],
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
      contentReplace,
      titleReplace,
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
      contentReplace,
      titleReplace,
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
          content_replace: cleaned.contentReplace,
          title_replace: cleaned.titleReplace,
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
    response.send(API_STATUS_CODE.okData(result))
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
    validatePageFixedParams(request, ['id', 'name', 'create_time', 'update_time'])
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
        bindings: { select: { alertRule: { select: { id: true, name: true, enabled: true } } } },
      },
    })
    const data = (result.data as Array<any>).map(({ _count, bindings, ...rest }) => ({
      ...rest,
      receiver_count: _count?.receivers ?? 0,
      alert_rules: bindings.map((link: any) => link.alertRule),
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
        _count: { select: { receivers: true } },
        bindings: {
          select: { alertRule: { select: { id: true, name: true, enabled: true, _count: { select: { channels: true } } } } },
        },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const { bindings, _count, ...rest } = rule
    response.send(API_STATUS_CODE.okData({
      ...rest,
      receiver_count: _count?.receivers ?? 0,
      alert_rule_ids: bindings.map(link => link.alertRule.id),
      alert_rules: bindings.map(link => ({
        id: link.alertRule.id,
        name: link.alertRule.name,
        enabled: link.alertRule.enabled,
        channel_count: link.alertRule._count.channels,
      })),
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
        ['titleMode', [false, 'string']],
        ['titleTemplate', [false, 'string']],
        ['contentReplace', [false, 'string']],
        ['titleReplace', [false, 'string']],
        ['alertRuleIds', [false, 'number[]']],
      ] as const,
    }, true)
    const cleaned = await validateMessageAlertDirectRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.messageAlertDirectRule.$create({
        name: cleaned.name,
        title_mode: cleaned.titleMode,
        title_template: cleaned.titleTemplate,
        content_replace: cleaned.contentReplace,
        title_replace: cleaned.titleReplace,
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
        ['contentReplace', [false, 'string']],
        ['titleReplace', [false, 'string']],
        ['alertRuleIds', [false, 'number[]']],
      ] as const,
    }, true)
    const {
      id,
      enabled,
      name,
      titleMode,
      titleTemplate,
      contentReplace,
      titleReplace,
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
      contentReplace,
      titleReplace,
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
          content_replace: cleaned.contentReplace,
          title_replace: cleaned.titleReplace,
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
    validatePageFixedParams(request, ['id', 'receiver', 'enabled'])
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
    // 名单默认按 id 升序，与导出、匹配遍历顺序一致
    const desc = request.query.order === '1'
    const result = await db.messageAlertDirectRuleReceiver.$page({
      where,
      orderBy: [{ [orderBy]: desc ? 'desc' : 'asc' }],
      page: String(request.query.page),
      size: String(request.query.size),
      include: { channels: { select: { channelId: true } } },
    })
    const data = (result.data as Array<any>).map(({ channels, ...rest }) => ({
      ...rest,
      channelIds: channels.map((link: any) => link.channelId),
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
        ['pattern', [false, 'string']],
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
        pattern: cleaned.pattern,
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
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 修改收信人（仅传 id 与 enabled 为行内启停，启用仍校验渠道非空；清空渠道自动禁用）
 */
api.put('/alert/direct/rule/receiver', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['receiver', [false, 'string']],
        ['pattern', [false, 'string']],
        ['remark', [false, 'string']],
        ['enabled', [false, [1, 0]]],
        ['channelIds', [false, 'number[]']],
      ] as const,
    }, true)
    const { id, receiver, pattern, remark, enabled, channelIds } = params.body
    const exists = await db.messageAlertDirectRuleReceiver.$getById(id)
    if (!exists) {
      throw new Error('收信人不存在')
    }
    if (enabled !== undefined && [receiver, pattern, remark, channelIds].every(field => field === undefined)) {
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
    // 字段级校验基于合并后的行数据，仅传部分字段时其余沿用现值；清空渠道且未显式启用时自动禁用
    const currentChannelIds = (await db.messageAlertDirectRuleReceiverChannel.$list(
      { where: { receiverId: id } },
      { select: { channelId: true } },
    )).map(link => link.channelId)
    const nextEnabled = enabled ?? (channelIds !== undefined && channelIds.length === 0 ? 0 : exists.enabled)
    const cleaned = validateMessageAlertDirectReceiver({
      receiver: receiver ?? exists.receiver,
      pattern: pattern ?? exists.pattern,
      remark: remark ?? exists.remark,
      enabled: nextEnabled,
      channelIds: channelIds ?? currentChannelIds,
    })
    if (receiver !== undefined) {
      await assertDirectReceiverUnique(exists.directRuleId, cleaned.receiver, id)
    }
    if (channelIds !== undefined) {
      await assertChannelsExist(cleaned.channelIds)
    }
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.messageAlertDirectRuleReceiver.$updateById({
        id,
        data: {
          receiver: cleaned.receiver,
          pattern: cleaned.pattern,
          remark: cleaned.remark,
          enabled: cleaned.enabled,
        },
      })
      if (channelIds !== undefined) {
        await tx.messageAlertDirectRuleReceiverChannel.deleteMany({ where: { receiverId: id } })
        if (cleaned.channelIds.length > 0) {
          await tx.messageAlertDirectRuleReceiverChannel.createMany({
            data: cleaned.channelIds.map(channelId => ({ receiverId: id, channelId })),
          })
        }
      }
      return row
    })
    response.send(API_STATUS_CODE.okData(updated))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除收信人：ids 批量（单次最多 1000，服务端分块）或 all 清空整份名单，二者必须二选一
 */
api.delete('/alert/direct/rule/receiver', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['ruleId', [true, 'number']],
        ['ids', [false, 'number[]']],
        ['all', [false, 'boolean']],
      ] as const,
    }, true)
    const { ruleId, ids, all } = params.body
    const rule = await db.messageAlertDirectRule.$getById(ruleId, 'id', { select: { id: true } })
    if (!rule) {
      throw new Error('规则不存在')
    }
    if (all === true) {
      await db.$transaction(async (tx) => {
        await tx.messageAlertDirectRuleReceiverChannel.deleteMany({ where: { receiver: { directRuleId: ruleId } } })
        await tx.messageAlertDirectRuleReceiver.deleteMany({ where: { directRuleId: ruleId } })
      })
      response.send(API_STATUS_CODE.ok())
      return
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('参数 ids 与 all 必须二选一')
    }
    if (ids.length > MESSAGE_ALERT_DIRECT_RECEIVER_DELETE_MAX_COUNT) {
      throw new Error(`单次最多删除 ${MESSAGE_ALERT_DIRECT_RECEIVER_DELETE_MAX_COUNT} 个收信人`)
    }
    // 先删渠道关联再删行；id 数量超过 SQLite 变量上限前分块
    const BATCH_SIZE = 500
    await db.$transaction(async (tx) => {
      for (let start = 0; start < ids.length; start += BATCH_SIZE) {
        const batch = ids.slice(start, start + BATCH_SIZE)
        await tx.messageAlertDirectRuleReceiverChannel.deleteMany({ where: { receiverId: { in: batch } } })
        await tx.messageAlertDirectRuleReceiver.deleteMany({ where: { id: { in: batch }, directRuleId: ruleId } })
      }
    })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 批量导入收信人：单次最多 1000，一律按禁用无渠道写入；payload 内与库内重复的标识跳过并计数
 */
api.post('/alert/direct/rule/receiver/import', async (request, response) => {
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
    if (receivers.length > MESSAGE_ALERT_DIRECT_RECEIVER_IMPORT_MAX_COUNT) {
      throw new Error(`单次最多导入 ${MESSAGE_ALERT_DIRECT_RECEIVER_IMPORT_MAX_COUNT} 个收信人`)
    }
    const cleaned = receivers.map((item: unknown, index: number) => {
      try {
        return validateMessageAlertDirectReceiverImportItem(item)
      }
      catch (e: any) {
        throw new Error(`第 ${index + 1} 项收信人不合法：${e.message}`)
      }
    })
    // payload 内重复取首次出现，后续计为跳过
    const seen = new Set<string>()
    let skipped = 0
    const unique: Array<{ receiver: string, pattern: string, remark: string }> = []
    for (const item of cleaned) {
      if (seen.has(item.receiver)) {
        skipped++
        continue
      }
      seen.add(item.receiver)
      unique.push(item)
    }
    let created = 0
    if (unique.length > 0) {
      const existed = await db.messageAlertDirectRuleReceiver.$list(
        { where: { directRuleId: ruleId, receiver: { in: unique.map(item => item.receiver) } } },
        { select: { receiver: true } },
      )
      const existedReceivers = new Set(existed.map(row => row.receiver))
      const toCreate = unique.filter(item => !existedReceivers.has(item.receiver))
      skipped += unique.length - toCreate.length
      if (toCreate.length > 0) {
        await db.$transaction(async (tx) => {
          const BATCH_SIZE = 500
          for (let start = 0; start < toCreate.length; start += BATCH_SIZE) {
            await tx.messageAlertDirectRuleReceiver.createMany({
              data: toCreate.slice(start, start + BATCH_SIZE).map(item => ({
                directRuleId: ruleId,
                receiver: item.receiver,
                pattern: item.pattern,
                remark: item.remark,
                enabled: 0,
              })),
            })
          }
        })
      }
      created = toCreate.length
    }
    response.send(API_STATUS_CODE.okData({ created, skipped }))
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
      { select: { receiver: true, pattern: true, remark: true } },
    )
    response.send(API_STATUS_CODE.okData({ receivers }))
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
      throw new Error('该规则仍有收信人，请先清空收信人')
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
 * 一对一规则命中测试（不落库、不发送）：按 id 读取已保存规则与启用收信人，与真实触发共用同一匹配函数
 */
api.post('/alert/direct/rule/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['message', [true, 'object']],
      ] as const,
    })
    const { id, message } = params.body
    const rule = await db.messageAlertDirectRule.$getById(id, 'id', {
      include: {
        receivers: {
          where: { enabled: 1 },
          include: { channels: { select: { channelId: true } } },
        },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const title = typeof message.title === 'string' ? message.title.trim() : ''
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (!title && !content) {
      throw new Error('测试消息的标题与内容至少填写一项')
    }
    // 替换与真实推送一致：内容替换先于收信人匹配执行，标题替换作用于渲染结果
    const replacedContent = await applyReplacements(content, rule.content_replace)
    const lines = prepareLines(replacedContent)
    const matchResults = await matchDirectRule(lines, rule.receivers)
    const matchedReceivers: Array<{ receiver: string, pattern: string, channel_count: number, matched_lines: string[] }> = []
    for (const [i, receiver] of rule.receivers.entries()) {
      const matched = matchResults[i]
      // 超时或异常与未命中语义不同，试测需明确报错而不是显示成未命中
      if (matched === null) {
        throw new Error(`收信人「${receiver.receiver}」匹配超时或异常，请稍后重试`)
      }
      if (matched.length === 0) {
        continue
      }
      // 行文本去重与真实推送的渠道内聚合一致
      matchedReceivers.push({
        receiver: receiver.receiver,
        pattern: receiver.pattern,
        channel_count: receiver.channels.length,
        matched_lines: [...new Set(matched.map(item => item.line))],
      })
    }
    // {{receiver}} 预览与真实推送一致：填充命中收信人标识的"、"连接
    const receiverLabels = matchedReceivers.map(item => item.receiver)
    response.send(API_STATUS_CODE.okData({
      title: await applyReplacements(
        renderDirectTitle(
          rule.title_mode as MessageAlertDirectTitleMode,
          rule.title_template,
          title,
          rule.name,
          receiverLabels.join('、'),
        ),
        rule.title_replace,
      ),
      matched: matchedReceivers.length > 0,
      total: rule.receivers.length,
      matched_count: matchedReceivers.length,
      receivers: matchedReceivers,
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
