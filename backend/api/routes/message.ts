import type { Express, Request } from 'express'
import type { messageAlertDirectRuleWhereInput, messageAlertRuleWhereInput, messageWhereInput } from '../../db'
import type { MessageAlertContext } from '../../core/message/alert'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import db from '../../db'
import { logger } from '../../utils/logger'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { getUnreadCount, pushUserMessage } from '../../core/message'
import { assertValidRegexPattern } from '../../core/alert/matcher'
import {
  evaluateDirectConditionsForTest,
  evaluateMessageAlertRule,
  extractMatchedLines,
  refreshHasEnabledRules,
  validateMessageAlertDirectRuleCore,
  validateMessageAlertDirectRulePayload,
  validateMessageAlertRuleCore,
  validateMessageAlertRulePayload,
} from '../../core/message/alert'
import {
  MESSAGE_CATEGORIES,
  MESSAGE_TYPES,
  MessageCategory,
  MessageScope,
  MessageType,
} from '../../core/type/message'
import { handleOpenApiError } from '../openapi/openApiCore'

const api: Express = express()
const apiOpen: Express = express()
const apiInner: Express = express()

// 消息关键字搜索长度上限
const MESSAGE_SEARCH_MAX_LENGTH = 100

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

// 批量操作 id 数量上限，防止超大 in 查询
const BATCH_ID_MAX_COUNT = 1000

// 批量端点 id 归一：逐项必须为正整数，数组长度受限
function parseBatchIds(id: unknown): number[] {
  const ids = Array.isArray(id) ? id : [id]
  if (ids.length > BATCH_ID_MAX_COUNT) {
    throw new Error(`批量操作 id 数量不能超过 ${BATCH_ID_MAX_COUNT}`)
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
      include: { _count: { select: { channels: true, directs: true } } },
    })
    const data = (result.data as Array<any>).map(({ _count, ...rest }) => ({
      ...rest,
      channelCount: _count?.channels ?? 0,
      directCount: _count?.directs ?? 0,
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
        directs: { include: { directRule: { select: { id: true, name: true } } } },
      },
    })
    if (!rule) {
      throw new Error('规则不存在')
    }
    const { conditions, channels, directs, ...rest } = rule
    response.send(API_STATUS_CODE.okData({
      ...rest,
      conditions,
      channels: channels.map(link => ({
        id: link.id,
        channelId: link.channelId,
        name: link.channel.name,
        type: link.channel.type,
      })),
      directRuleIds: directs.map(link => link.directRuleId),
      directRules: directs.map(link => link.directRule),
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
        ['directRuleIds', [false, 'number[]']],
      ] as const,
    }, true)
    const cleaned = await validateMessageAlertRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.messageAlertRule.create({
        data: {
          name: cleaned.name,
          logic: cleaned.logic,
          categories: cleaned.categories,
          types: cleaned.types,
        },
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
      await tx.messageAlertRuleDirect.createMany({
        data: cleaned.directRuleIds.map(directRuleId => ({
          messageAlertRuleId: created.id,
          directRuleId,
        })),
      })
      return created
    })
    // 刷新失败只记日志：标记失真仅影响一次额外查询或漏判，不应阻断规则增删改
    try {
      await refreshHasEnabledRules()
    }
    catch (e: any) {
      logger.error('[消息中心监控告警] 刷新启用规则标记失败', { error: e?.message })
    }
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新规则（整体替换条件与关联；仅提供 id 与 enabled 时为快速启停）
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
        ['directRuleIds', [false, 'number[]']],
      ] as const,
    }, true)
    const { id, enabled, name, logic, categories, types, conditions, channelIds, directRuleIds } = params.body
    const exists = await db.messageAlertRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    // 快速启停：只更新 enabled 字段，不触碰条件与关联
    if (enabled !== undefined && [name, logic, categories, types, conditions, channelIds, directRuleIds].every(field => field === undefined)) {
      const rule = await db.messageAlertRule.$updateById({ id, data: { enabled } })
      // 刷新失败只记日志：标记失真仅影响一次额外查询或漏判，不应阻断规则增删改
      try {
        await refreshHasEnabledRules()
      }
      catch (e: any) {
        logger.error('[消息中心监控告警] 刷新启用规则标记失败', { error: e?.message })
      }
      response.send(API_STATUS_CODE.okData(rule))
      return
    }
    const cleaned = await validateMessageAlertRulePayload(params.body, { excludeId: id })
    const rule = await db.$transaction(async (tx) => {
      const updated = await tx.messageAlertRule.update({
        where: { id },
        data: {
          name: cleaned.name,
          logic: cleaned.logic,
          categories: cleaned.categories,
          types: cleaned.types,
          ...(enabled !== undefined ? { enabled } : {}),
        },
      })
      await tx.messageAlertRuleCondition.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRuleChannel.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRuleDirect.deleteMany({ where: { messageAlertRuleId: id } })
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
      await tx.messageAlertRuleChannel.createMany({
        data: cleaned.channelIds.map(channelId => ({
          messageAlertRuleId: id,
          channelId,
        })),
      })
      await tx.messageAlertRuleDirect.createMany({
        data: cleaned.directRuleIds.map(directRuleId => ({
          messageAlertRuleId: id,
          directRuleId,
        })),
      })
      return updated
    })
    // 刷新失败只记日志：标记失真仅影响一次额外查询或漏判，不应阻断规则增删改
    try {
      await refreshHasEnabledRules()
    }
    catch (e: any) {
      logger.error('[消息中心监控告警] 刷新启用规则标记失败', { error: e?.message })
    }
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
    await db.$transaction(async (tx) => {
      await tx.messageAlertRuleChannel.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRuleCondition.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRuleDirect.deleteMany({ where: { messageAlertRuleId: id } })
      await tx.messageAlertRule.delete({ where: { id } })
    })
    // 刷新失败只记日志：标记失真仅影响一次额外查询或漏判，不应阻断规则增删改
    try {
      await refreshHasEnabledRules()
    }
    catch (e: any) {
      logger.error('[消息中心监控告警] 刷新启用规则标记失败', { error: e?.message })
    }
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
        ['directRuleIds', [false, 'number[]']],
      ] as const,
    })
    const { rule, message, directRuleIds } = params.body
    const cleanedRule = validateMessageAlertRuleCore(rule, { allowEmptyConditions: (directRuleIds?.length ?? 0) > 0 })

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
    // 试测联动：逐条挂载的一对一规则返回条件命中明细与提取行预览，不推送不落库
    const directRules = (directRuleIds?.length ?? 0) > 0
      ? await db.messageAlertDirectRule.findMany({
          where: { id: { in: directRuleIds } },
          include: { conditions: { orderBy: { sort: 'asc' } } },
        })
      : []
    const directResults = await Promise.all(directRules.map(async (directRule) => {
      const evaluation = await evaluateDirectConditionsForTest(
        { title, content },
        {
          logic: directRule.logic,
          conditions: directRule.conditions.map(condition => ({
            mode: condition.mode,
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            sort: condition.sort,
            enabled: condition.enabled,
          })),
        },
      )
      const extract = evaluation.matched
        ? await extractMatchedLines(directRule.extract_regex, content)
        : null
      return {
        directRuleId: directRule.id,
        name: directRule.name,
        matched: evaluation.matched,
        conditions: evaluation.conditions,
        extractedLines: extract?.lines ?? [],
        truncated: extract?.truncated ?? false,
        total: extract?.total ?? 0,
      }
    }))
    response.send(API_STATUS_CODE.okData({ ...result, directRules: directResults }))
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
      include: { _count: { select: { channels: true, conditions: true } } },
    })
    const data = (result.data as Array<any>).map(({ _count, ...rest }) => ({
      ...rest,
      channelCount: _count?.channels ?? 0,
      conditionCount: _count?.conditions ?? 0,
    }))
    response.send(API_STATUS_CODE.okData({ ...result, data }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 一对一规则全量精简列表（主规则挂载选择）
 */
api.get('/alert/direct/rule/list', async (_request, response) => {
  try {
    const result = await db.messageAlertDirectRule.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, enabled: true },
    })
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
 * 新建一对一规则
 */
api.post('/alert/direct/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [false, 'string']],
        ['logic', [false, 'string']],
        ['conditions', [false, 'object[]']],
        ['extractRegex', [false, 'string']],
        ['titleMode', [false, 'string']],
        ['titleTemplate', [false, 'string']],
        ['channelIds', [false, 'number[]']],
      ] as const,
    }, true)
    const cleaned = await validateMessageAlertDirectRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.messageAlertDirectRule.create({
        data: {
          name: cleaned.name,
          logic: cleaned.logic,
          extract_regex: cleaned.extractRegex,
          title_mode: cleaned.titleMode,
          title_template: cleaned.titleTemplate,
        },
      })
      await tx.messageAlertDirectRuleCondition.createMany({
        data: cleaned.conditions.map((condition, index) => ({
          messageAlertDirectRuleId: created.id,
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          enabled: condition.enabled,
          remark: condition.remark,
          sort: index,
        })),
      })
      await tx.messageAlertDirectRuleChannel.createMany({
        data: cleaned.channelIds.map(channelId => ({
          messageAlertDirectRuleId: created.id,
          channelId,
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
 * 更新一对一规则（整体替换条件与关联；仅提供 id 与 enabled 时为快速启停）
 */
api.put('/alert/direct/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['enabled', [false, [1, 0]]],
        ['name', [false, 'string']],
        ['logic', [false, 'string']],
        ['conditions', [false, 'object[]']],
        ['extractRegex', [false, 'string']],
        ['titleMode', [false, 'string']],
        ['titleTemplate', [false, 'string']],
        ['channelIds', [false, 'number[]']],
      ] as const,
    }, true)
    const { id, enabled, name, logic, conditions, extractRegex, titleMode, titleTemplate, channelIds } = params.body
    const exists = await db.messageAlertDirectRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    // 快速启停：只更新 enabled 字段，不触碰条件与关联
    if (enabled !== undefined && [name, logic, conditions, extractRegex, titleMode, titleTemplate, channelIds].every(field => field === undefined)) {
      const rule = await db.messageAlertDirectRule.$updateById({ id, data: { enabled } })
      response.send(API_STATUS_CODE.okData(rule))
      return
    }
    const cleaned = await validateMessageAlertDirectRulePayload(params.body, { excludeId: id })
    const rule = await db.$transaction(async (tx) => {
      const updated = await tx.messageAlertDirectRule.update({
        where: { id },
        data: {
          name: cleaned.name,
          logic: cleaned.logic,
          extract_regex: cleaned.extractRegex,
          title_mode: cleaned.titleMode,
          title_template: cleaned.titleTemplate,
          ...(enabled !== undefined ? { enabled } : {}),
        },
      })
      await tx.messageAlertDirectRuleCondition.deleteMany({ where: { messageAlertDirectRuleId: id } })
      await tx.messageAlertDirectRuleChannel.deleteMany({ where: { messageAlertDirectRuleId: id } })
      await tx.messageAlertDirectRuleCondition.createMany({
        data: cleaned.conditions.map((condition, index) => ({
          messageAlertDirectRuleId: id,
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          enabled: condition.enabled,
          remark: condition.remark,
          sort: index,
        })),
      })
      await tx.messageAlertDirectRuleChannel.createMany({
        data: cleaned.channelIds.map(channelId => ({
          messageAlertDirectRuleId: id,
          channelId,
        })),
      })
      return updated
    })
    response.send(API_STATUS_CODE.okData(rule))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除一对一规则（被告警规则挂载时拒绝；事务内先删关联、再删条件、最后删规则）
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
    const mountings = await db.messageAlertRuleDirect.findMany({
      where: { directRuleId: id },
      include: { messageAlertRule: { select: { name: true } } },
    })
    if (mountings.length > 0) {
      throw new Error(`规则正被以下告警规则挂载，请先解除挂载：${mountings.map(link => link.messageAlertRule.name).join('、')}`)
    }
    await db.$transaction(async (tx) => {
      await tx.messageAlertDirectRuleChannel.deleteMany({ where: { messageAlertDirectRuleId: id } })
      await tx.messageAlertDirectRuleCondition.deleteMany({ where: { messageAlertDirectRuleId: id } })
      await tx.messageAlertDirectRule.delete({ where: { id } })
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
    const cleanedRule = validateMessageAlertDirectRuleCore(rule)
    const extractRegex = typeof rule.extractRegex === 'string' ? rule.extractRegex : ''
    try {
      assertValidRegexPattern(extractRegex)
    }
    catch {
      throw new Error('截取正则表达式无效')
    }
    const title = typeof message.title === 'string' ? message.title.trim() : ''
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (!title && !content) {
      throw new Error('测试消息的标题与内容至少填写一项')
    }
    const evaluation = await evaluateDirectConditionsForTest(
      { title, content },
      { logic: cleanedRule.logic, conditions: cleanedRule.conditions },
    )
    const extract = evaluation.matched
      ? await extractMatchedLines(extractRegex, content)
      : null
    response.send(API_STATUS_CODE.okData({
      matched: evaluation.matched,
      conditions: evaluation.conditions,
      extractedLines: extract?.lines ?? [],
      truncated: extract?.truncated ?? false,
      total: extract?.total ?? 0,
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
    await pushUserMessage({ title, content, type: type as MessageType })
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
    await pushUserMessage({ title, content, type: type as MessageType })
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
