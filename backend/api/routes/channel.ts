import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import type { notificationChannelWhereInput } from '../../db'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { pushChannel } from '../../core/channel'
import { validateChannelPayload } from '../../core/channel/validation'

const api: Express = express()

// 测试发送固定文案
const TEST_NOTIFY_TITLE = '测试通知'
const TEST_NOTIFY_CONTENT = '这是一条来自 Arcadia 平台的测试通知，收到即表示渠道配置有效。'

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
 * 渠道分页列表（个人设置管理页）
 */
api.get('/page', async (request, response) => {
  try {
    validatePageFixedParams(request, ['id', 'name', 'create_time', 'update_time'])
    validateRequestParams(request, {
      query: [
        ['type', [false, 'string']],
      ],
    })
    const where: notificationChannelWhereInput = {}
    const and: notificationChannelWhereInput[] = []
    if (request.query.search) {
      and.push({ name: { contains: request.query.search as string } })
    }
    if (request.query.type) {
      and.push({ type: { equals: request.query.type as string } })
    }
    if (and.length > 0) {
      where.AND = and
    }
    const orderBy = request.query.orderBy as string || 'id'
    const desc = request.query.order !== '0'
    const result = await db.notificationChannel.$page({
      where,
      orderBy: [{ [orderBy]: desc ? 'desc' : 'asc' }],
      page: String(request.query.page),
      size: String(request.query.size),
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 渠道全量精简列表（业务表单选渠道）
 */
api.get('/list', async (_request, response) => {
  try {
    const result = await db.notificationChannel.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, type: true },
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 渠道详情（含 config，供编辑）
 */
api.get('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const id = parseQueryId(params.query.id)
    const channel = await db.notificationChannel.$getById(id)
    if (!channel) {
      throw new Error('渠道不存在')
    }
    response.send(API_STATUS_CODE.okData(channel))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 新建渠道
 */
api.post('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [false, 'string']],
        ['type', [false, 'string']],
        ['config', [false, 'string | object']],
      ] as const,
    }, true)
    const cleaned = await validateChannelPayload(params.body)
    const channel = await db.notificationChannel.$create(cleaned)
    response.send(API_STATUS_CODE.okData(channel))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 更新渠道
 */
api.put('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['name', [false, 'string']],
        ['type', [false, 'string']],
        ['config', [false, 'string | object']],
      ] as const,
    }, true)
    const { id } = params.body
    const exists = await db.notificationChannel.$getById(id)
    if (!exists) {
      throw new Error('渠道不存在')
    }
    const cleaned = await validateChannelPayload(params.body, { excludeId: id })
    const channel = await db.notificationChannel.$updateById({ id, data: cleaned })
    response.send(API_STATUS_CODE.okData(channel))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除渠道（被业务引用则拒绝）
 */
api.delete('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ] as const,
    })
    const { id } = params.body
    const exists = await db.notificationChannel.$getById(id)
    if (!exists) {
      throw new Error('渠道不存在')
    }
    const refCount = await db.messageAlertRuleChannel.count({ where: { channelId: id } })
    if (refCount > 0) {
      throw new Error(`该渠道已被 ${refCount} 条消息中心监控告警规则引用，请先解除关联`)
    }
    await db.notificationChannel.$deleteById(id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 渠道测试发送（不落库）
 */
api.post('/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [false, 'string']],
        ['type', [false, 'string']],
        ['config', [false, 'string | object']],
      ] as const,
    }, true)
    const cleaned = await validateChannelPayload(params.body, { skipNameCheck: true })
    const result = await pushChannel(
      { type: cleaned.type, config: cleaned.config },
      { title: TEST_NOTIFY_TITLE, content: TEST_NOTIFY_CONTENT },
    )
    if (!result.success) {
      response.send(API_STATUS_CODE.fail(result.error))
      return
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export { api as API }
