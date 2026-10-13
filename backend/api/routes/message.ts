import type { Express, Request } from 'express'
import type { messageAlertDirectRuleWhereInput, messageAlertRuleWhereInput, messageWhereInput } from '../../db'
import type { MessageAlertContext } from '../../core/message/alert'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { getUnreadCount, sendUserMessage } from '../../core/message'
import { applyReplacements, validateReplaceText } from '../../core/alert'
import {
  evaluateMessageAlertRule,
  matchKeywordLines,
  refreshEnabledRuleIndex,
  renderDirectTitle,
  validateMessageAlertDirectKeywordPayload,
  validateMessageAlertDirectKeywords,
  validateMessageAlertDirectRulePayload,
  validateMessageAlertDirectTitle,
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
      channelCount: _count?.channels ?? 0,
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
    if (enabled !== undefined && [name, logic, categories, types, conditions, channelIds, contentReplace, titleReplace].every(field => field === undefined)) {
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
        _count: { select: { keywords: true } },
        bindings: { select: { alertRule: { select: { id: true, name: true, enabled: true } } } },
      },
    })
    const data = (result.data as Array<any>).map(({ _count, bindings, ...rest }) => ({
      ...rest,
      keywordCount: _count?.keywords ?? 0,
      alertRules: bindings.map((link: any) => link.alertRule),
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
 * 一对一规则详情
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
        keywords: {
          orderBy: { sort: 'asc' },
          include: { channels: { select: { channelId: true } } },
        },
        bindings: {
          select: { alertRule: { select: { id: true, name: true, enabled: true, _count: { select: { channels: true } } } } },
        },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const { keywords, bindings, ...rest } = rule
    response.send(API_STATUS_CODE.okData({
      ...rest,
      keywords: keywords.map(keyword => ({
        pattern: keyword.pattern,
        receiver: keyword.receiver,
        remark: keyword.remark,
        enabled: keyword.enabled,
        sort: keyword.sort,
        channelIds: keyword.channels.map(link => link.channelId),
      })),
      alertRuleIds: bindings.map(link => link.alertRule.id),
      alertRules: bindings.map(link => ({
        id: link.alertRule.id,
        name: link.alertRule.name,
        enabled: link.alertRule.enabled,
        channelCount: link.alertRule._count.channels,
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
 * 更新一对一规则主体（全局规则绑定仅在显式提供 ruleIds 时替换；仅提供 id 与 enabled 时为快速启停）；关键字由独立端点维护
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
    if (enabled !== undefined && [name, titleMode, titleTemplate, contentReplace, titleReplace, alertRuleIds].every(field => field === undefined)) {
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
 * 整体替换一对一规则收信人（允许空数组清空；事务内先删渠道与收信人行再分批重建）
 */
api.put('/alert/direct/rule/keyword', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['keywords', [false, 'object[]']],
      ] as const,
    }, true)
    const { id, keywords } = params.body
    const exists = await db.messageAlertDirectRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    const cleaned = await validateMessageAlertDirectKeywordPayload(keywords)
    await db.$transaction(async (tx) => {
      // 先删孙表再删子表，避免外键残留
      await tx.messageAlertDirectRuleKeywordChannel.deleteMany({ where: { keyword: { directRuleId: id } } })
      await tx.messageAlertDirectRuleKeyword.deleteMany({ where: { directRuleId: id } })
      // 分批重建：数千条收信人逐条创建会拖慢事务甚至触发交互式事务超时
      const BATCH_SIZE = 500
      for (let start = 0; start < cleaned.length; start += BATCH_SIZE) {
        const batch = cleaned.slice(start, start + BATCH_SIZE)
        const created = await tx.messageAlertDirectRuleKeyword.createManyAndReturn({
          data: batch.map((keyword, offset) => ({
            directRuleId: id,
            pattern: keyword.pattern,
            receiver: keyword.receiver,
            remark: keyword.remark,
            enabled: keyword.enabled,
            sort: start + offset,
          })),
        })
        const channelLinks = created.flatMap((row, offset) =>
          batch[offset].channelIds.map(channelId => ({ keywordId: row.id, channelId })))
        if (channelLinks.length > 0) {
          await tx.messageAlertDirectRuleKeywordChannel.createMany({ data: channelLinks })
        }
      }
    })
    response.send(API_STATUS_CODE.ok())
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
    const keywordCount = await db.messageAlertDirectRuleKeyword.count({ where: { directRuleId: id } })
    if (keywordCount > 0) {
      throw new Error('该规则仍有收信人，请先清空收信人')
    }
    await db.$transaction(async (tx) => {
      await tx.messageAlertDirectRuleBinding.deleteMany({ where: { directRuleId: id } })
      await tx.messageAlertDirectRuleKeywordChannel.deleteMany({ where: { keyword: { directRuleId: id } } })
      await tx.messageAlertDirectRuleKeyword.deleteMany({ where: { directRuleId: id } })
      await tx.messageAlertDirectRule.$deleteById(id)
    })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 一对一规则命中测试（不落库、不发送）
 */
api.post('/alert/direct/rule/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['rule', [true, 'object']],
        ['message', [true, 'object']],
      ] as const,
    })
    const { rule, message } = params.body
    // 收信人数量不设上限，试测与真实推送同样按有限并发匹配
    const rawKeywords = Array.isArray(rule.keywords) ? rule.keywords : []
    const keywords = rawKeywords.length > 0 ? validateMessageAlertDirectKeywords(rawKeywords) : []
    // 禁用收信人不参与匹配，与真实触发行为一致
    const activeKeywords = keywords.filter(keyword => keyword.enabled === 1)
    const { titleMode, titleTemplate } = validateMessageAlertDirectTitle(rule)
    // 替换与真实推送一致：内容替换先于收信人匹配执行，标题替换作用于渲染结果
    const contentReplace = validateReplaceText(rule.contentReplace)
    const titleReplace = validateReplaceText(rule.titleReplace)
    const title = typeof message.title === 'string' ? message.title.trim() : ''
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (!title && !content) {
      throw new Error('测试消息的标题与内容至少填写一项')
    }
    const ruleName = typeof rule.name === 'string' ? rule.name.trim() : ''
    const replacedContent = await applyReplacements(content, contentReplace)
    const keywordResults = await Promise.all(activeKeywords.map(async (keyword) => {
      // 超时或异常与未命中语义不同，试测需明确报错而不是显示成未命中
      const lines = await matchKeywordLines(keyword.pattern, keyword.receiver, replacedContent)
      if (lines === null) {
        throw new Error(`收信人「${keyword.receiver}」匹配超时或异常，请稍后重试`)
      }
      // 行文本去重与真实推送的渠道内聚合一致
      const matchedLines = [...new Set(lines.map(item => item.line))]
      return {
        receiver: keyword.receiver,
        pattern: keyword.pattern,
        channelCount: keyword.channelIds.length,
        matched: matchedLines.length > 0,
        matchedLines,
      }
    }))
    // {{receiver}} 预览与真实推送一致：填充命中收信人标识的"、"连接
    const receiverLabels = [...new Set(activeKeywords
      .filter((_, index) => keywordResults[index].matched)
      .map(keyword => keyword.receiver))]
    response.send(API_STATUS_CODE.okData({
      title: await applyReplacements(renderDirectTitle(titleMode, titleTemplate, title, ruleName, receiverLabels.join('、')), titleReplace),
      matched: keywordResults.some(keyword => keyword.matched),
      keywords: keywordResults,
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
