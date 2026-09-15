import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import type { alertRuleWhereInput } from '../../db'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import type { AlertMessageContext } from '../../core/alert/matcher'
import { evaluateRule } from '../../core/alert/matcher'
import { validateRuleCore, validateRulePayload } from '../../core/alert/validation'

const api: Express = express()

/**
 * query 参数 id 解析
 */
function parseQueryId(value: string): number {
  if (!/^\d+$/.test(value) || Number.parseInt(value) <= 0) {
    throw new Error('参数 id 无效（参数值类型错误）')
  }
  return Number.parseInt(value)
}

/**
 * 规则分页列表（消息中心抽屉）
 */
api.get('/rule/page', async (request, response) => {
  try {
    validatePageFixedParams(request, ['id', 'name', 'create_time', 'update_time'])
    validateRequestParams(request, {
      query: [
        ['enabled', [false, ['1', '0']]],
      ],
    })
    const where: alertRuleWhereInput = {}
    const and: alertRuleWhereInput[] = []
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
    const result = await db.alertRule.$page({
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
 * 规则详情（有序 conditions + channels）
 */
api.get('/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const id = parseQueryId(params.query.id)
    const rule = await db.alertRule.$getById(id, 'id', {
      include: {
        conditions: { orderBy: { sort: 'asc' } },
        channels: { orderBy: { sort: 'asc' }, include: { channel: true } },
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
        sort: link.sort,
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
api.post('/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [false, 'string']],
        ['logic', [false, 'string']],
        ['categories', [false, 'string', true]],
        ['types', [false, 'string', true]],
        ['conditions', [false, 'object[]']],
        ['channelIds', [false, 'number[]']],
      ] as const,
    }, true)
    const cleaned = await validateRulePayload(params.body)
    const rule = await db.$transaction(async (tx) => {
      const created = await tx.alertRule.create({
        data: {
          name: cleaned.name,
          scope: cleaned.scope,
          logic: cleaned.logic,
          categories: cleaned.categories,
          types: cleaned.types,
        },
      })
      await tx.alertRuleCondition.createMany({
        data: cleaned.conditions.map((condition, index) => ({
          alertRuleId: created.id,
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          sort: index,
        })),
      })
      await tx.alertRuleChannel.createMany({
        data: cleaned.channelIds.map((channelId, index) => ({
          alertRuleId: created.id,
          channelId,
          sort: index,
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
 * 更新规则（整体替换条件与关联；仅提供 id 与 enabled 时为快速启停）
 */
api.put('/rule', async (request, response) => {
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
      ] as const,
    }, true)
    const { id, enabled, name, logic, categories, types, conditions, channelIds } = params.body
    const exists = await db.alertRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    // 快速启停：只更新 enabled 字段，不触碰条件与关联
    if (enabled !== undefined && [name, logic, categories, types, conditions, channelIds].every(field => field === undefined)) {
      const rule = await db.alertRule.$updateById({ id, data: { enabled } })
      response.send(API_STATUS_CODE.okData(rule))
      return
    }
    const cleaned = await validateRulePayload(params.body, { excludeId: id })
    const rule = await db.$transaction(async (tx) => {
      const updated = await tx.alertRule.update({
        where: { id },
        data: {
          name: cleaned.name,
          scope: cleaned.scope,
          logic: cleaned.logic,
          categories: cleaned.categories,
          types: cleaned.types,
        },
      })
      await tx.alertRuleCondition.deleteMany({ where: { alertRuleId: id } })
      await tx.alertRuleChannel.deleteMany({ where: { alertRuleId: id } })
      await tx.alertRuleCondition.createMany({
        data: cleaned.conditions.map((condition, index) => ({
          alertRuleId: id,
          mode: condition.mode,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          sort: index,
        })),
      })
      await tx.alertRuleChannel.createMany({
        data: cleaned.channelIds.map((channelId, index) => ({
          alertRuleId: id,
          channelId,
          sort: index,
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
 * 删除规则（事务内先删关联、再删条件、最后删规则）
 */
api.delete('/rule', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ] as const,
    })
    const { id } = params.body
    const exists = await db.alertRule.$getById(id)
    if (!exists) {
      throw new Error('规则不存在')
    }
    await db.$transaction(async (tx) => {
      await tx.alertRuleChannel.deleteMany({ where: { alertRuleId: id } })
      await tx.alertRuleCondition.deleteMany({ where: { alertRuleId: id } })
      await tx.alertRule.delete({ where: { id } })
    })
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 规则命中测试（不落库、不发送）
 */
api.post('/rule/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['rule', [true, 'object']],
        ['message', [true, 'object']],
      ] as const,
    })
    const { rule, message } = params.body
    const cleanedRule = validateRuleCore(rule)

    const title = typeof message.title === 'string' ? message.title.trim() : ''
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (!title && !content) {
      throw new Error('测试消息的标题与内容至少填写一项')
    }
    const msg: AlertMessageContext = {
      title,
      content,
      category: typeof message.category === 'string' ? message.category : '',
      type: typeof message.type === 'string' ? message.type : '',
    }
    const result = evaluateRule(msg, {
      logic: cleanedRule.logic,
      categories: cleanedRule.categories,
      types: cleanedRule.types,
      conditions: cleanedRule.conditions,
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export { api as API }
