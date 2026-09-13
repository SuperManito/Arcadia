import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import type { dependencyManageWhereInput } from '../../db'
import db from '../../db'
import { validatePageFixedParams, validateRequestParams } from '../../utils'
import { assertNotProtected, DepStatus, ECOSYSTEMS, enqueueInstall, enqueueUninstall, syncDeps } from '../../core/dep'
import { handleOpenApiError } from '../openapi/openApiCore'

const api: Express = express()
const apiOpen: Express = express()

/**
 * 获取依赖列表（分页）
 */
api.get('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['search', [false, 'string', true]],
        ['ecosystem', [false, 'string', true]],
        ['status', [false, 'string', true]],
      ] as const,
    })
    const { search, ecosystem, status } = params.query
    const where: dependencyManageWhereInput = {}
    const and: dependencyManageWhereInput[] = []
    // 生态过滤
    if (ecosystem) {
      and.push({ ecosystem: { equals: ecosystem } })
    }
    // 状态过滤
    if (status) {
      and.push({ status: { equals: Number.parseInt(status) } })
    }
    // 搜索过滤（名称 / 备注）
    if (search) {
      and.push({
        OR: [
          { name: { contains: search } },
          { remark: { contains: search } },
        ],
      })
    }
    if (and.length > 0) {
      where.AND = and
    }
    // 排序
    const orderByField = request.query.orderBy as string | undefined
    let desc = true
    if (request.query.order === '0')
      desc = false
    const result = await db.dependencyManage.$page({
      where,
      orderBy: orderByField ? { [orderByField]: desc ? 'desc' : 'asc' } : { id: 'desc' },
      page: String(request.query.page),
      size: String(request.query.size),
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validatePageFixedParams(request, ['name', 'ecosystem', 'status', 'installed_ver', 'create_time', 'update_time'])
    const params = validateRequestParams(request, {
      query: [
        ['search', [false, 'string', true]],
        ['ecosystem', [false, ECOSYSTEMS]],
        ['status', [false, ['0', '1', '2', '3', '4']]],
      ] as const,
    }, true)
    const { search, ecosystem, status } = params.query
    const where: dependencyManageWhereInput = {}
    const and: dependencyManageWhereInput[] = []
    // 生态过滤
    if (ecosystem) {
      and.push({ ecosystem: { equals: ecosystem } })
    }
    // 状态过滤
    if (status) {
      and.push({ status: { equals: Number.parseInt(status) } })
    }
    // 搜索过滤（名称 / 备注）
    if (search) {
      and.push({
        OR: [
          { name: { contains: search } },
          { remark: { contains: search } },
        ],
      })
    }
    if (and.length > 0) {
      where.AND = and
    }
    // 排序
    const orderByField = request.query.orderBy as string | undefined
    let desc = true
    if (request.query.order === '0')
      desc = false
    const result = await db.dependencyManage.$page({
      where,
      orderBy: orderByField ? { [orderByField]: desc ? 'desc' : 'asc' } : { id: 'desc' },
      page: String(request.query.page),
      size: String(request.query.size),
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Dependency] 获取依赖列表')
  }
})

/**
 * 新增依赖记录
 */
api.post('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['name', [true, 'string | string[]']],
        ['ecosystem', [true, ECOSYSTEMS]],
        ['remark', [false, 'string']],
      ] as const,
    })
    const { name, ecosystem, remark } = params.body
    const names = Array.isArray(name) ? name : [name]
    const cleanRemark = remark?.trim() ?? ''

    // 逐项校验并去重
    const formatData: Array<{ name: string, ecosystem: string, remark: string, status: number }> = []
    const seen = new Set<string>()
    for (const rawName of names) {
      const cleanName = rawName.trim()
      if (!cleanName)
        throw new Error('名称不能为空')
      const key = `${ecosystem}:${cleanName}`
      if (seen.has(key))
        continue
      seen.add(key)
      assertNotProtected(ecosystem, cleanName, '添加')
      const exists = await db.dependencyManage.findFirst({ where: { name: cleanName, ecosystem } })
      if (exists)
        throw new Error(`${cleanName} 依赖已存在`)
      formatData.push({
        name: cleanName,
        ecosystem,
        remark: cleanRemark,
        status: DepStatus.NOT_INSTALLED,
      })
    }

    const result = await db.dependencyManage.$create(formatData)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/create', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['name', [true, 'string | string[]']],
        ['ecosystem', [true, ECOSYSTEMS]],
        ['remark', [false, 'string']],
      ] as const,
    }, true)
    const { name, ecosystem, remark } = params.body
    const names = Array.isArray(name) ? name : [name]
    const cleanRemark = remark?.trim() ?? ''
    // 逐项校验并去重
    const formatData: Array<{ name: string, ecosystem: string, remark: string, status: number }> = []
    const seen = new Set<string>()
    for (const rawName of names) {
      const cleanName = rawName.trim()
      if (!cleanName)
        throw new Error('名称不能为空')
      const key = `${ecosystem}:${cleanName}`
      if (seen.has(key))
        continue
      seen.add(key)
      assertNotProtected(ecosystem, cleanName, '添加')
      const exists = await db.dependencyManage.findFirst({ where: { name: cleanName, ecosystem } })
      if (exists)
        throw new Error(`${cleanName} 依赖已存在`)
      formatData.push({
        name: cleanName,
        ecosystem,
        remark: cleanRemark,
        status: DepStatus.NOT_INSTALLED,
      })
    }
    const result = await db.dependencyManage.$create(formatData)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Dependency] 创建依赖')
  }
})

/**
 * 删除依赖记录，安装中 / 卸载中状态不允许删除
 */
api.delete('/', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    })
    const { id } = params.body
    const ids = Array.isArray(id) ? id : [id]
    if (ids.some(v => v <= 0))
      throw new Error('参数 id 无效（参数值类型错误）')

    const items = await db.dependencyManage.$list({ where: { id: { in: ids } } })
    if (items.length === 0)
      throw new Error('未找到指定依赖')
    for (const item of items) {
      if (item.status === DepStatus.INSTALLING || item.status === DepStatus.UNINSTALLING) {
        throw new Error(`依赖 ${item.name} 正在操作中，请稍后再试`)
      }
    }
    await db.dependencyManage.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/delete', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    }, true)
    const { id } = params.body
    const ids = Array.isArray(id) ? id : [id]
    if (ids.some(v => v <= 0))
      throw new Error('参数 id 无效（参数值类型错误）')
    const items = await db.dependencyManage.$list({ where: { id: { in: ids } } })
    if (items.length === 0)
      throw new Error('未找到指定依赖')
    for (const item of items) {
      if (item.status === DepStatus.INSTALLING || item.status === DepStatus.UNINSTALLING)
        throw new Error(`依赖 ${item.name} 正在操作中，请稍后再试`)
    }
    await db.dependencyManage.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Dependency] 删除依赖')
  }
})

/**
 * 安装 / 卸载 / 同步状态
 */
api.post('/operate', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['action', [true, ['install', 'uninstall', 'sync']]],
        ['ids', [false, 'number[]']],
      ] as const,
    })
    const { action, ids } = params.body
    // sync 同步已安装版本
    if (action === 'sync') {
      const result = await syncDeps()
      response.send(API_STATUS_CODE.okData(result))
      return
    }

    if (!ids || ids.length === 0)
      throw new Error('ids 不能为空')
    const items = await db.dependencyManage.$list({ where: { id: { in: ids } } })
    if (items.length === 0)
      throw new Error('未找到指定依赖')

    // 仅未安装 / 失败的依赖可安装
    if (action === 'install') {
      const toInstall = items.filter(
        v => v.status === DepStatus.NOT_INSTALLED || v.status === DepStatus.FAILED,
      )
      if (toInstall.length === 0)
        throw new Error('所选依赖均无需安装')
      for (const v of toInstall)
        assertNotProtected(v.ecosystem, v.name)
      enqueueInstall(toInstall.map(v => ({ id: v.id, name: v.name, ecosystem: v.ecosystem })))
      response.send(API_STATUS_CODE.okData({ total: toInstall.length }))
      return
    }
    // 仅已安装 / 失败且有已安装版本的依赖可卸载
    if (action === 'uninstall') {
      const toUninstall = items.filter(v => (v.status === DepStatus.INSTALLED || v.status === DepStatus.FAILED) && !!v.installed_ver)
      if (toUninstall.length === 0)
        throw new Error('所选依赖均无需卸载')
      for (const v of toUninstall)
        assertNotProtected(v.ecosystem, v.name)
      enqueueUninstall(toUninstall.map(v => ({ id: v.id, name: v.name, ecosystem: v.ecosystem })))
      response.send(API_STATUS_CODE.okData({ total: toUninstall.length }))
    }
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/operate', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['action', [true, ['install', 'uninstall', 'sync']]],
        ['ids', [false, 'number[]']],
      ] as const,
    }, true)
    const { action, ids } = params.body
    // sync 同步已安装版本
    if (action === 'sync') {
      const result = await syncDeps()
      response.send(API_STATUS_CODE.okData(result))
      return
    }

    if (!ids || ids.length === 0)
      throw new Error('ids 不能为空')
    const items = await db.dependencyManage.$list({ where: { id: { in: ids } } })
    if (items.length === 0)
      throw new Error('未找到指定依赖')

    // 仅未安装 / 失败的依赖可安装，逐项严格校验
    if (action === 'install') {
      for (const v of items) {
        if (v.status !== DepStatus.NOT_INSTALLED && v.status !== DepStatus.FAILED)
          throw new Error(`依赖 ${v.name} 当前状态不允许安装`)
        assertNotProtected(v.ecosystem, v.name)
      }
      enqueueInstall(items.map(v => ({ id: v.id, name: v.name, ecosystem: v.ecosystem })))
      response.send(API_STATUS_CODE.okData({ total: items.length }))
      return
    }
    // 仅已安装 / 失败且有已安装版本的依赖可卸载，逐项严格校验
    if (action === 'uninstall') {
      for (const v of items) {
        const canUninstall = (v.status === DepStatus.INSTALLED || v.status === DepStatus.FAILED) && !!v.installed_ver
        if (!canUninstall)
          throw new Error(`依赖 ${v.name} 当前状态不允许卸载`)
        assertNotProtected(v.ecosystem, v.name)
      }
      enqueueUninstall(items.map(v => ({ id: v.id, name: v.name, ecosystem: v.ecosystem })))
      response.send(API_STATUS_CODE.okData({ total: items.length }))
    }
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Dependency] 依赖操作')
  }
})

/**
 * 查询依赖的最近错误日志
 */
api.get('/error', async (request, response) => {
  try {
    validateRequestParams(request, {
      query: [['id', [true, 'string']]] as const,
    })
    const idStr = request.query.id as string
    if (!/^\d+$/.test(idStr) || Number.parseInt(idStr) <= 0)
      throw new Error('参数 id 无效（参数值类型错误）')
    const id = Number.parseInt(idStr)
    const item = await db.dependencyManage.$getById(id)
    if (!item)
      throw new Error('依赖不存在')
    response.send(API_STATUS_CODE.okData({ id: item.id, last_error: item.last_error }))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/error', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      query: [['id', [true, 'string']]] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0)
      throw new Error('参数 id 无效（参数值类型错误）')
    const record = await db.dependencyManage.$getById(Number.parseInt(id))
    if (!record)
      throw new Error('依赖不存在')
    response.send(API_STATUS_CODE.okData({ id: record.id, last_error: record.last_error }))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Dependency] 查询依赖错误日志')
  }
})

/**
 * 查询依赖（OpenAPI）
 */
apiOpen.get('/v1/query', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
      ] as const,
    })
    const { id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0)
      throw new Error('参数 id 无效（参数值类型错误）')
    const record = await db.dependencyManage.$getById(Number.parseInt(id))
    if (!record)
      throw new Error('依赖不存在')
    response.send(API_STATUS_CODE.okData(record))
  }
  catch (e: any) {
    handleOpenApiError(e, response, '[OpenAPI · Dependency] 查询依赖')
  }
})

export {
  api as API,
  apiOpen as OpenAPI,
}
