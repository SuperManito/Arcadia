import type { Express } from 'express'
import type { notificationChannelWhereInput } from '../../db'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { getChannelReferences, pushChannel, TEST_NOTIFY_CONTENT, TEST_NOTIFY_TITLE } from '../../core/channel'
import { validateChannelPayload } from '../../core/channel/validation'

const api: Express = express()

/**
 * 渠道分页列表（个人设置管理页；不含 config，编辑与测试发送按 id 另行获取）
 */
api.get('/page', async (request, response) => {
  try {
    validatePageFixedParams(request, ['id', 'name', 'create_time', 'update_time'])
    validateRequestParams(request, {
      query: [
        ['type', [false, 'string']],
        ['tags', [false, 'string']],
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
    // 标签存逗号分隔（首尾各带一个逗号），多个标签逐个 contains 取交集
    const tags = request.query.tags
      ? String(request.query.tags).split(',').filter(Boolean)
      : []
    tags.forEach(tag => and.push({ tags: { contains: `,${tag},` } }))
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
      select: { id: true, name: true, type: true, tags: true, create_time: true, update_time: true },
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
    const result = await db.notificationChannel.$list(
      { orderBy: { id: 'asc' } },
      { select: { id: true, name: true, type: true, tags: true } },
    )
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
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    const channel = await db.notificationChannel.$getById(Number.parseInt(id))
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
        ['tags', [false, 'string | string[]']],
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
        ['tags', [false, 'string | string[]']],
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
    const { alertRuleCount, directRuleCount, taskCount } = await getChannelReferences(id)
    const refMessages: string[] = []
    if (alertRuleCount > 0) {
      refMessages.push(`${alertRuleCount} 条消息中心监控告警规则`)
    }
    if (directRuleCount > 0) {
      refMessages.push(`${directRuleCount} 条一对一规则`)
    }
    if (taskCount > 0) {
      refMessages.push(`${taskCount} 个定时任务`)
    }
    if (refMessages.length > 0) {
      throw new Error(`该渠道已被 ${refMessages.join('、')}引用，请先解除关联`)
    }
    await db.notificationChannel.$deleteById(id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 渠道测试发送（不落库）；传 id 按已存配置发送，未传按提交配置（编辑表单未保存场景）
 */
api.post('/test', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [false, 'number']],
        ['name', [false, 'string']],
        ['type', [false, 'string']],
        ['config', [false, 'string | object']],
        ['title', [false, 'string']],
        ['content', [false, 'string']],
      ] as const,
    }, true)
    let type: string
    let config: string
    if (params.body.id !== undefined) {
      const channel = await db.notificationChannel.$getById(params.body.id)
      if (!channel) {
        throw new Error('渠道不存在')
      }
      type = channel.type
      config = channel.config
    }
    else {
      const cleaned = await validateChannelPayload(params.body, { skipNameCheck: true })
      type = cleaned.type
      config = cleaned.config
    }
    const result = await pushChannel(
      { type, config },
      {
        title: params.body.title?.trim() || TEST_NOTIFY_TITLE,
        content: params.body.content?.trim() || TEST_NOTIFY_CONTENT,
      },
      // 测试发送是手动单次调用，绕过类型级节流 FIFO，避免窗口占满时请求长时间挂起
      { bypassThrottle: true },
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
