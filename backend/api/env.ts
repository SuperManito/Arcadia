import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { logger } from '../utils/logger'
import type {
  ComboEnvsGroupWithCount,
  envsGroupModel,
  envsGroupWhereInput,
  envsModel,
  envsWhereInput,
  GetBatchResult,
  PageResult,
} from '../db'
import db, { flattenEnvsGroupPageResult, flattenIncludeRelationCount } from '../db'
import type { EnvTag, TypeCategory } from '../core/env'
import {
  checkVaribleExsit,
  convertToCLIExport,
  EnvTypes,
  fixItemOrder,
  fixOrder,
  getCurrentMaxSortValue,
  getTagsList,
  getTagsListItem,
  isComposite,
  tagLabelContainsFilter,
  updateItemSortById,
  updateSortById,
} from '../core/env'
import { validateEnvName } from '../utils/envUtil'
import type { ValidateObjectParamType } from '../utils'
import {
  cleanProperties,
  validateObject,
  validatePageFixedParams,
  validateRequestParams,
} from '../utils'

const api: Express = express()
const apiOpen: Express = express()

// 数据更新回调
async function onChange(isItem: boolean) {
  if (typeof isItem === 'boolean') {
    if (isItem) {
      await fixItemOrder()
    }
    else {
      await fixOrder()
    }
  }
  else {
    await fixOrder()
    await fixItemOrder()
  }
  // 生成用于 CLI 的批量声明脚本
  await convertToCLIExport()
}

// 初始化
;(async function init() {
  await db.envsGroup.$upsertById({
    id: 0,
    type: '_SPECIAL_',
    enable: 0,
    sort: 99999,
  })
  await onChange(false)
}())

api.get('/page', async (request, response) => {
  try {
    const enable = request.query.enable ? (request.query.enable as string).split(',') : []
    const where: envsGroupWhereInput = {}
    // 启用/禁用状态过滤
    if (enable.length > 0) {
      const or: envsGroupWhereInput[] = []
      enable.forEach((value) => {
        or.push({ enable: { equals: Number.parseInt(value) } })
      })
      where.OR = or
    }
    // 过滤掉特殊记录
    where.id = { not: 0 }
    // 搜索 + tag_list 过滤
    const andConditionsPage: envsGroupWhereInput[] = []
    if (request.query.search) {
      andConditionsPage.push({
        OR: [
          { type: { contains: String(request.query.search) } },
          { description: { contains: String(request.query.search) } },
        ],
      })
    }
    const tagsPage = request.query.tags
      ? (request.query.tags as string).split(',').filter(Boolean)
      : []
    tagsPage.forEach(tag => andConditionsPage.push(tagLabelContainsFilter(tag) as envsGroupWhereInput))
    if (andConditionsPage.length > 0) {
      where.AND = andConditionsPage
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const envsGroupPageResult = await db.envsGroup.$page({
      where,
      page: String(request.query.page),
      size: String(request.query.size),
      orderBy: { [orderBy]: desc ? 'desc' : 'asc' },
      include: {
        _count: { select: { envs: true } },
      },
    })
    const result = flattenEnvsGroupPageResult(envsGroupPageResult)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

api.get('/pageItem', async (request, response) => {
  try {
    const where: envsWhereInput = {}
    const enable = request.query.enable ? (request.query.enable as string).split(',') : []
    // 启用/禁用状态过滤
    if (enable.length > 0) {
      const or: envsWhereInput[] = []
      enable.forEach((value) => {
        or.push({ enable: { equals: Number.parseInt(value) } })
      })
      where.OR = or
    }
    // group_id
    if (request.query.group_id) {
      where.group_id = { equals: Number.parseInt(request.query.group_id as string) }
    }
    else {
      where.group_id = { equals: 0 } // 默认值
    }
    // 搜索 + tag_list 过滤
    const andConditionsPageItem: envsWhereInput[] = []
    if (request.query.search) {
      const search = request.query.search as string
      andConditionsPageItem.push({
        OR: request.query.group_id === '0'
          ? [
              { type: { contains: search } },
              { value: { contains: search } },
              { description: { contains: search } },
            ]
          : [
              { value: { contains: search } },
              { remark: { contains: search } },
            ],
      })
    }
    const tagsPageItem = request.query.tags
      ? (request.query.tags as string).split(',').filter(Boolean)
      : []
    tagsPageItem.forEach(tag => andConditionsPageItem.push(tagLabelContainsFilter(tag) as envsWhereInput))
    if (andConditionsPageItem.length > 0) {
      where.AND = andConditionsPageItem
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await db.envs.$page({
      where,
      page: request.query.page as string,
      size: request.query.size as string,
      orderBy: { [orderBy]: desc ? 'desc' : 'asc' },
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validatePageFixedParams(request, ['sort', 'update_time'])
    const params = validateRequestParams(request, {
      query: [
        ['category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
        ['enable', [false, ['1', '0', '1,0', '0,1']]],
        ['compositeId', [false, 'string']],
      ] as const,
    })
    const where: envsGroupWhereInput & envsWhereInput = {}
    const { category, compositeId } = params.query
    const search = request.query.search as string
    const tags = request.query.tags
      ? (request.query.tags as string).split(',').filter(Boolean)
      : []
    switch (category) {
      case EnvTypes.ORDINARY: {
        // 默认值
        where.group_id = { equals: 0 }
        // 搜索 + tag_list 过滤
        const andOrdinary: envsWhereInput[] = []
        if (search) {
          andOrdinary.push({
            OR: [
              { type: { contains: search } },
              { value: { contains: search } },
              { description: { contains: search } },
            ],
          })
        }
        tags.forEach(tag => andOrdinary.push(tagLabelContainsFilter(tag) as envsWhereInput))
        if (andOrdinary.length > 0) {
          where.AND = andOrdinary
        }
        break
      }
      case EnvTypes.COMPOSITE: {
        // 过滤掉特殊记录
        where.id = { not: 0 }
        // 搜索 + tag_list 过滤
        const andComposite: envsGroupWhereInput[] = []
        if (search) {
          andComposite.push({
            OR: [
              { type: { contains: search } },
              { description: { contains: search } },
            ],
          })
        }
        tags.forEach(tag => andComposite.push(tagLabelContainsFilter(tag) as envsGroupWhereInput))
        if (andComposite.length > 0) {
          where.AND = andComposite
        }
        break
      }
      case EnvTypes.COMPOSITE_VALUE: {
        if (typeof compositeId === 'undefined') {
          throw new Error('需要提供 compositeId 参数')
        }
        if (!/^\d+$/.test(compositeId) || Number.parseInt(compositeId) <= 0) {
          throw new Error('参数 compositeId 无效（参数值类型错误）')
        }
        where.group_id = { equals: Number.parseInt(compositeId) }
        // 搜索 + tag_list 过滤
        const andCompositeValue: envsWhereInput[] = []
        if (search) {
          andCompositeValue.push({
            OR: [
              { value: { contains: search } },
              { remark: { contains: search } },
            ],
          })
        }
        tags.forEach(tag => andCompositeValue.push(tagLabelContainsFilter(tag) as envsWhereInput))
        if (andCompositeValue.length > 0) {
          where.AND = andCompositeValue
        }
        break
      }
    }
    // 启用/禁用状态过滤
    const enable = params.query.enable ? params.query.enable.split(',') : []
    if (enable.length > 0) {
      const or: (envsGroupWhereInput & envsWhereInput)[] = []
      enable.forEach((value) => {
        or.push({ enable: { equals: Number.parseInt(value) } })
      })
      where.OR = or
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    let result: PageResult<(envsModel[] | ComboEnvsGroupWithCount[])>
    if (category === EnvTypes.COMPOSITE) {
      const envsGroupPageResult = await db.envsGroup.$page({
        where,
        page: request.query.page as string,
        size: request.query.size as string,
        orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
        include: {
          _count: { select: { envs: true } },
        },
      })
      result = flattenEnvsGroupPageResult(envsGroupPageResult)
    }
    else {
      result = await db.envs.$page({
        where,
        page: request.query.page as string,
        size: request.query.size as string,
        orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
      })
    }
    // 返回数据
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/query', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      query: [
        ['name', [false, 'string']],
        ['type', [false, 'string']],
        ['description', [false, 'string']],
      ] as const,
    })
    const { name, type, description } = params.query
    if (!name && !type && !description) {
      throw new Error('至少需要提供 name、type、description 的其中一个参数')
    }
    const result: (envsModel | ComboEnvsGroupWithCount)[] = []
    // 构建查询条件
    const queryConditions: (envsWhereInput & envsGroupWhereInput)[] = []
    if (type) {
      queryConditions.push({ type: { contains: type } }) // 优先使用 type
    }
    else if (name) {
      queryConditions.push({ type: { contains: name } })
    }
    if (description) {
      queryConditions.push({ description: { contains: description } })
    }
    // 查询 envs 表
    const envsResult = await db.envs.$list({
      group_id: 0,
      AND: queryConditions,
    }) || []
    if (envsResult.length > 0) {
      result.push(...envsResult)
    }
    // 查询 envsGroup 表
    const envsGroupResult = await db.envsGroup.$list({
      id: { not: 0 },
      AND: queryConditions,
    }, undefined, { include: { _count: { select: { envs: true } } } }) || []
    if (envsGroupResult.length > 0) {
      result.push(...flattenIncludeRelationCount(envsGroupResult))
    }
    // 二次过滤（注：SQLite 的 contains 操作符不区分大小写）
    const filteredData = result.filter((item: envsModel | ComboEnvsGroupWithCount) => {
      const matchesName = name ? item.type.includes(name) : true
      const matchesDescription = description ? item.description.includes(description) : true
      return matchesName && matchesDescription
    })
    // 返回数据
    if (filteredData.length <= 0) {
      response.send(API_STATUS_CODE.okData([]))
    }
    else {
      const datas = filteredData.map((data) => {
        let category: TypeCategory
        if (Object.keys(data).includes('group_id')) {
          category = (data as envsModel).group_id === 0
            ? EnvTypes.ORDINARY
            : EnvTypes.COMPOSITE_VALUE
        }
        else {
          category = EnvTypes.COMPOSITE
        }
        return { category, data }
      })
      response.send(API_STATUS_CODE.okData(datas))
    }
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/queryMember', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
        ['value', [false, 'string']],
        ['remark', [false, 'string']],
      ] as const,
    })
    const { id, value, remark } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    if (!value && !remark) {
      throw new Error('至少需要提供 value、remark 的其中一个参数')
    }
    // 构建查询条件
    const queryConditions: envsWhereInput[] = []
    if (value) {
      queryConditions.push({ value: { contains: value } })
    }
    if (remark) {
      queryConditions.push({ remark: { contains: remark } })
    }
    // 查询 envs 表
    const result = await db.envs.$list({
      group_id: Number.parseInt(id),
      AND: queryConditions,
    }) || []
    // 返回数据
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/queryById', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      query: [
        ['category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
        ['id', [true, 'string']],
      ] as const,
    })
    const { category, id } = params.query
    if (!/^\d+$/.test(id) || Number.parseInt(id) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    let record: envsModel | ComboEnvsGroupWithCount | null = null
    if (category === EnvTypes.COMPOSITE) {
      const envsGroupResult = await db.envsGroup.$getById(String(id), undefined, {
        include: { _count: { select: { envs: true } } },
      })
      if (envsGroupResult) {
        record = flattenIncludeRelationCount(envsGroupResult)
      }
    }
    else {
      record = await db.envs.$getById(String(id))
    }
    if (!record) {
      throw new Error('变量不存在')
    }
    response.send(API_STATUS_CODE.okData(record))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.post('/save', async (request, response) => {
  try {
    const env = request.body
    // 校验变量名合法性
    if (env.type) {
      validateEnvName(env.type)
    }
    // 新增判断是否重复添加
    if (!env.id) {
      await checkVaribleExsit(env.type)
    }
    if (!env.sort) {
      env.sort = 99999
    }
    await db.envsGroup.$upsertById(env)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
  finally {
    await onChange(false)
  }
})

api.post('/saveItem', async (request, response) => {
  try {
    const env = request.body
    if (!env.group_id) {
      env.group_id = 0
    }
    // 校验变量名合法性
    if (env.type && env.group_id === 0) {
      validateEnvName(env.type)
    }
    // 新增判断是否重复添加（不考虑添加复合变量关联值）
    if (!env.id && env.group_id === 0) {
      await checkVaribleExsit(env.type)
    }
    if (!env.sort) {
      env.sort = 99999
    }
    await db.envs.$upsertById(env)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
  finally {
    await onChange(true)
  }
})

api.post('/create', async (request, response) => {
  try {
    let data: envsGroupModel[]
    if (Array.isArray(request.body)) {
      data = request.body.map((e: any) => Object.assign({}, e))
    }
    else {
      data = [Object.assign({}, request.body)]
    }
    const formatData: envsGroupModel[] = []
    for (const obj of data) {
      // 检查变量合法性与重名
      validateEnvName(obj.type)
      await checkVaribleExsit(obj.type)
      formatData.push(obj)
    }
    const result = await db.envsGroup.$create(formatData)
    response.send(API_STATUS_CODE.okData(result))
    await onChange(false)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.post('/createItem', async (request, response) => {
  try {
    let data: envsModel[]
    if (Array.isArray(request.body)) {
      data = request.body.map((e: any) => Object.assign({}, e))
    }
    else {
      data = [Object.assign({}, request.body)]
    }
    const formatData: envsModel[] = []
    for (const obj of data) {
      // 检查变量合法性与重名
      if (obj.type) {
        validateEnvName(obj.type)
        await checkVaribleExsit(obj.type)
      }
      formatData.push(obj)
    }
    const result = await db.envs.$create(formatData)
    response.send(API_STATUS_CODE.okData(result))
    await onChange(true)
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
        ['category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
        ['compositeId', [false, 'number']],
        ['data', [true, 'object']],
      ] as const,
    })
    const { category, compositeId } = params.body
    let data: (envsModel | envsGroupModel)[]
    if (Array.isArray(params.body.data)) {
      data = params.body.data.map((e: any) => Object.assign({}, e))
    }
    else {
      data = [Object.assign({}, params.body.data)]
    }
    // 过滤数据
    let validateRules: ValidateObjectParamType[] = []
    switch (category) {
      case EnvTypes.ORDINARY:
        validateRules = [
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['value', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case EnvTypes.COMPOSITE:
        validateRules = [
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['separator', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case EnvTypes.COMPOSITE_VALUE:
        if (typeof compositeId === 'undefined') {
          throw new Error('需要提供 compositeId 参数')
        }
        if (compositeId <= 0) {
          throw new Error('参数 compositeId 无效（参数值类型错误）')
        }
        validateRules = [
          ['remark', [false, 'string']],
          ['value', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
    }
    const fields = validateRules.map((rule) => rule[0])
    const formatData: (envsModel | envsGroupModel)[] = []
    for (let obj of data) {
      // 属性校验
      validateObject(obj, validateRules)
      // clean
      obj = cleanProperties(obj, fields)
      // 检查变量合法性与重名
      if ([EnvTypes.ORDINARY, EnvTypes.COMPOSITE].includes(category)) {
        validateEnvName(obj.type)
        await checkVaribleExsit(obj.type)
      }
      // 补齐参数
      if (category === EnvTypes.ORDINARY) {
        (obj as envsModel).group_id = 0
      }
      else if (category === EnvTypes.COMPOSITE_VALUE) {
        (obj as envsModel).group_id = compositeId as number
        obj.type = '' // 复合变量值的 type 为空
      }
      formatData.push(obj)
    }
    let result: envsModel | envsGroupModel | GetBatchResult
    if (category === EnvTypes.COMPOSITE) {
      result = await db.envsGroup.$create(formatData as envsGroupModel[])
    }
    else {
      result = await db.envs.$create(formatData as envsModel[])
    }
    response.send(API_STATUS_CODE.okData(result))
    logger.info('[OpenAPI · Env]', '创建环境变量', JSON.stringify(data.length === 1 ? formatData[0] : formatData))
    await onChange(category !== EnvTypes.COMPOSITE)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/update', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
        ['data', [true, 'object']],
      ] as const,
    })
    const { category } = params.body
    let data: (envsModel | envsGroupModel)[]
    if (Array.isArray(params.body.data)) {
      data = params.body.data.map((e: any) => Object.assign({}, e))
    }
    else {
      data = [Object.assign({}, params.body.data)]
    }
    // 过滤数据
    let validateRules: ValidateObjectParamType[] = []
    switch (category) {
      case EnvTypes.ORDINARY:
        validateRules = [
          ['id', [true, 'number']],
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['value', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case EnvTypes.COMPOSITE:
        validateRules = [
          ['id', [true, 'number']],
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['separator', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case EnvTypes.COMPOSITE_VALUE:
        validateRules = [
          ['id', [true, 'number']],
          ['group_id', [true, 'number']],
          ['remark', [false, 'string']],
          ['value', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
    }
    const fields = validateRules.map((rule) => rule[0])
    const existGroupIds: number[] = [] // 已存在的复合变量(组) id（临时）
    const formatData: (envsModel | envsGroupModel)[] = []
    for (let obj of data) {
      // 属性校验
      validateObject(obj, validateRules)
      // clean
      obj = cleanProperties(obj, fields)
      // 检测
      if (category === EnvTypes.COMPOSITE_VALUE) {
        if (obj.id <= 0) {
          throw new Error('参数 id 无效（参数值类型错误）')
        }
        if ((obj as envsModel).group_id <= 0) {
          throw new Error('参数 group_id 无效（参数值类型错误）')
        }
        // 检查变量是否存在
        const envsItems = await db.envs.$list({ id: obj.id }) || []
        if (envsItems.length <= 0) {
          throw new Error(`参数 id 无效，复合变量的值 ${obj.id} 不存在`)
        }
        // 检查复合变量(组)是否存在（仅一次）
        if (!existGroupIds.includes((obj as envsModel).group_id)) {
          if (((await db.envsGroup.$list({
            id: (obj as envsModel).group_id,
          })) || []).length > 0) {
            existGroupIds.push(obj.id)
          }
          else {
            throw new Error(`参数 group_id 无效，复合变量(组) ${(obj as envsModel).group_id} 不存在`)
          }
        }
        // 补齐参数
        obj.type = '' // 复合变量值的 type 为空
      }
      else {
        if (obj.id <= 0) {
          throw new Error('参数 id 无效（参数值类型错误）')
        }
        if (category === EnvTypes.ORDINARY) {
          // 检查变量是否存在
          const envsItems = await db.envs.$list({ id: obj.id }) || []
          if (envsItems.length <= 0) {
            throw new Error(`参数 id 无效，普通变量 ${obj.id} 不存在`)
          }
          // 补齐参数
          (obj as envsModel).group_id = 0
        }
        else if (category === EnvTypes.COMPOSITE) {
          // 检查变量是否存在
          const envsGroupItems = await db.envsGroup.$list({ id: obj.id }) || []
          if (envsGroupItems.length <= 0) {
            throw new Error(`参数 id 无效，复合变量(组) ${obj.id} 不存在`)
          }
        }
      }
      formatData.push(obj)
    }
    const result: (envsModel | envsGroupModel)[] = []
    for (const item of formatData) {
      if (isComposite(item, category === EnvTypes.COMPOSITE)) {
        result.push(await db.envsGroup.$upsertById(item))
      }
      else {
        result.push(await db.envs.$upsertById(item))
      }
    }
    response.send(API_STATUS_CODE.okData(result))
    logger.info('[OpenAPI · Env]', '更新环境变量', JSON.stringify(data.length === 1 ? formatData[0] : formatData))
    await onChange(category !== EnvTypes.COMPOSITE)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.put('/changeStatus', async (request, response) => {
  try {
    const id = request.body.id
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    const status = request.body.enable
    for (const id of ids) {
      const record = await db.envsGroup.$getById(id)
      if (!record) {
        throw new Error('变量不存在')
      }
      record.enable = status
      await db.envsGroup.$upsertById(record)
    }
    response.send(API_STATUS_CODE.ok())
    await onChange(false)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.put('/changeStatusItem', async (request, response) => {
  try {
    const id = request.body.id
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    const status = request.body.enable
    for (const id of ids) {
      const record = await db.envs.$getById(id)
      if (!record) {
        throw new Error('变量不存在')
      }
      record.enable = status
      await db.envs.$upsertById(record)
    }
    response.send(API_STATUS_CODE.ok())
    await onChange(true)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/changeStatus', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
        ['status', [true, [1, 0]]],
        ['isComposite', [false, 'boolean']],
      ] as const,
    })
    const { id, status, isComposite } = params.body
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    for (const id of ids) {
      let record: envsModel | envsGroupModel | null
      if (isComposite) {
        record = await db.envsGroup.$getById(id)
      }
      else {
        record = await db.envs.$getById(id)
      }
      if (!record) {
        throw new Error('变量不存在')
      }
      record.enable = status
      if (isComposite) {
        await db.envsGroup.$upsertById(record as envsGroupModel)
      }
      else {
        await db.envs.$upsertById(record as envsModel)
      }
      logger.info('[OpenAPI · Env]', '更改环境变量状态', id, status === 1 ? '启用' : '禁用', record)
    }
    response.send(API_STATUS_CODE.ok())
    await onChange(!isComposite)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.delete('/delete', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    })
    const { id } = params.body
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    await db.envs.$deleteById(ids, 'group_id')
    await db.envsGroup.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
  finally {
    await onChange(false)
  }
})

api.delete('/deleteItem', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
      ] as const,
    })
    const { id } = params.body
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    await db.envs.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
  finally {
    await onChange(true)
  }
})

apiOpen.post('/v1/delete', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number | number[]']],
        ['isComposite', [false, 'boolean']],
      ] as const,
    })
    const { id, isComposite } = params.body
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    if (isComposite) {
      await db.envs.$deleteById(ids, 'group_id')
      await db.envsGroup.$deleteById(ids)
    }
    else {
      await db.envs.$deleteById(ids)
    }
    response.send(API_STATUS_CODE.ok())
    logger.info('[OpenAPI · Env]', '删除环境变量', ids.join(','))
    await onChange(!isComposite)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.put('/order', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['order', [false, 'number']],
        ['moveToEnd', [false, 'boolean']],
      ] as const,
    })
    const { id, order, moveToEnd } = params.body
    let orderValue = order
    if (id <= 0) {
      response.send(API_STATUS_CODE.fail('参数 id 无效（参数值类型错误）'))
      return
    }
    if (typeof order === 'number' && order < 0) {
      response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
      return
    }
    if (typeof order === 'undefined' && !moveToEnd) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    // 移动到最后
    if (moveToEnd) {
      orderValue = await getCurrentMaxSortValue(true)
    }
    const result = await updateSortById(id, orderValue as number)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
  finally {
    await onChange(false) // 注：无实际意义的操作，排序变动不需要重新生成批量声明脚本
  }
})

api.put('/orderItem', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['order', [false, 'number']],
        ['moveToEnd', [false, 'boolean']],
      ] as const,
    })
    const { id, order, moveToEnd } = params.body
    let orderValue = order
    if (id <= 0) {
      response.send(API_STATUS_CODE.fail('参数 id 无效（参数值类型错误）'))
      return
    }
    if (typeof order === 'number' && order < 0) {
      response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
      return
    }
    if (typeof order === 'undefined' && !moveToEnd) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    // 移动到最后
    if (moveToEnd) {
      orderValue = await getCurrentMaxSortValue(false)
    }
    const result = await updateItemSortById(id, orderValue as number)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
  finally {
    await onChange(true)
  }
})

apiOpen.post('/v1/order', async (request, response) => {
  try {
    // 传参校验
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['order', [false, 'number']],
        ['moveToEnd', [false, 'boolean']],
        ['isComposite', [false, 'boolean']],
      ] as const,
    })
    const { id, order, moveToEnd, isComposite } = params.body
    let orderValue = order
    if (id <= 0) {
      response.send(API_STATUS_CODE.fail('参数 id 无效（参数值类型错误）'))
      return
    }
    if (typeof order === 'number' && order < 0) {
      response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
      return
    }
    if (typeof order === 'undefined' && !moveToEnd) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    if (isComposite) {
      const envsGroupRecord = await db.envsGroup.$getById(id)
      if (!envsGroupRecord) {
        response.send(API_STATUS_CODE.fail('变量不存在'))
        return
      }
      // 移动到最后
      if (moveToEnd) {
        orderValue = await getCurrentMaxSortValue(true)
      }
      const result = await updateSortById(id, orderValue as number)
      response.send(API_STATUS_CODE.okData(result))
    }
    else {
      const envsRecord = await db.envs.$getById(id)
      if (!envsRecord) {
        response.send(API_STATUS_CODE.fail('变量不存在'))
        return
      }
      // 移动到最后
      if (moveToEnd) {
        orderValue = await getCurrentMaxSortValue(false)
      }
      const result = await updateItemSortById(id, orderValue as number)
      response.send(API_STATUS_CODE.okData(result))
    }
    await onChange(!isComposite)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.get('/tagsItem', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['group_id', [false, 'string']],
      ] as const,
    })
    const { group_id } = params.query
    let compositeId: number
    if (group_id) {
      if (!/^\d+$/.test(group_id) || Number.parseInt(group_id) < 0) {
        throw new Error('参数 group_id 无效（参数值类型错误）')
      }
      compositeId = Number.parseInt(group_id)
    }
    else {
      compositeId = 0
    }
    const tags = await getTagsListItem(compositeId)
    response.send(API_STATUS_CODE.okData(tags))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.get('/tags', async (_request, response) => {
  try {
    const tags = await getTagsList()
    response.send(API_STATUS_CODE.okData(tags))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/tags', async (request, response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
        ['compositeId', [false, 'string']],
      ] as const,
    })
    const { category, compositeId } = params.query
    let result: EnvTag[]
    if (category === EnvTypes.COMPOSITE) {
      result = await getTagsList()
    }
    else {
      let group_id: number = 0
      if (typeof compositeId === 'undefined') {
        throw new Error('需要提供 compositeId 参数')
      }
      if (!/^\d+$/.test(compositeId) || Number.parseInt(compositeId) < 0) {
        throw new Error('参数 compositeId 无效（参数值类型错误）')
      }
      group_id = Number.parseInt(compositeId)
      result = await getTagsListItem(group_id)
    }
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

export {
  api as API,
  apiOpen as OpenAPI,
}
