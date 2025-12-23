import type { Express } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { logger } from '../utils/logger'
import type {
  ComboEnvsGroupModel,
  envsGroupModel,
  envsGroupWhereInput,
  envsModel,
  envsWhereInput,
  PageResult,
} from '../db'
import db from '../db'
import { generateEnvSh } from '../utils/envUtil'
import type { ValidateObjectParamType } from '../utils'
import { cleanProperties, validateObject, validatePageParams, validateParams } from '../utils'

const api: Express = express()
const apiOpen: Express = express()

enum EnvTypes {
  ORDINARY = 'ordinary',
  COMPOSITE = 'composite',
  COMPOSITE_VALUE = 'composite_value',
}

type TypeCategory = EnvTypes

// 数据更新回调
async function onChange(isItem?: boolean) {
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
  // 生成本地 env.sh
  const env_groups: ComboEnvsGroupModel[] = await db.envsGroup.$list(
    {
      id: { not: 0 },
    },
    {
      sort: 'asc', // 升序
    },
    {
      include: {
        envs: true,
      },
    },
  )
  const envs: envsModel[] = await db.envs.$list({
    group_id: 0,
  })
  generateEnvSh(env_groups, envs)
}

// 初始化
;(async function init() {
  await db.envsGroup.$upsertById({
    id: 0,
    type: '_SPECIAL_',
    enable: 0,
    sort: 99999,
  })
  await onChange()
}())

api.get('/page', async (request, response) => {
  try {
    const enable = request.query.enable ? (request.query.enable as string).split(',')[0] : '0'
    const where: envsGroupWhereInput = {}
    // 启用/禁用状态过滤
    if (enable) {
      where.enable = Number.parseInt(enable)
    }
    // 过滤掉特殊记录
    where.id = { not: 0 }
    // 搜索过滤
    if (request.query.search) {
      where.AND = {
        OR: [
          { type: { contains: String(request.query.search) } },
          { description: { contains: String(request.query.search) } },
        ],
      }
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await db.envsGroup.$page({
      where,
      page: String(request.query.page),
      size: String(request.query.size),
      orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
      include: {
        envs: true,
      },
    });
    (result.data as any) = result.data.map((item) => ({
      ...item,
      envs: item.envs.length,
    }))
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

api.get('/pageItem', async (request, response) => {
  try {
    const where: envsWhereInput = {}
    const enable = request.query.enable ? (request.query.enable as string).split(',')[0] : '0'
    // 启用/禁用状态过滤
    if (enable) {
      where.enable = Number.parseInt(enable)
    }
    // 默认值
    if (request.query.group_id) {
      where.group_id = { equals: Number.parseInt(request.query.group_id as string) }
    }
    // 搜索过滤
    if (request.query.search) {
      const search = request.query.search as string
      where.AND = {
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
      }
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    response.send(API_STATUS_CODE.okData(await db.envs.$page({
      where,
      page: request.query.page as string,
      size: request.query.size as string,
      orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
    })))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validatePageParams(request, ['sort', 'updateTime'])
    validateParams(request, [
      ['query', 'category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
      ['query', 'enable', [false, ['1', '0']]],
    ])
    const where: envsGroupWhereInput & envsWhereInput = {}
    const category = request.query.category
    switch (category) {
      case EnvTypes.ORDINARY:
        // 默认值
        where.group_id = { equals: 0 }
        // 搜索过滤
        if (request.query.search) {
          const search = request.query.search as string
          where.AND = {
            OR: [
              { type: { contains: search } },
              { value: { contains: search } },
              { description: { contains: search } },
            ],
          }
        }
        break
      case EnvTypes.COMPOSITE:
        // 过滤掉特殊记录
        where.id = { not: 0 }
        // 搜索过滤
        if (request.query.search) {
          const search = request.query.search as string
          where.AND = {
            OR: [
              { type: { contains: search } },
              { description: { contains: search } },
            ],
          }
        }
        break
      case EnvTypes.COMPOSITE_VALUE:
        // 默认值
        validateParams(request, [
          ['query', 'compositeId', [true, 'string']],
        ])
        if (Number.parseInt(request.query.compositeId as string) <= 0) {
          throw new Error('参数 compositeId 无效（参数值类型错误）')
        }
        where.group_id = { equals: Number.parseInt(request.query.compositeId as string) }
        // 搜索过滤
        if (request.query.search) {
          const search = request.query.search as string
          where.AND = {
            OR: [
              { value: { contains: search } },
              { remark: { contains: search } },
            ],
          }
        }
        break
    }
    // 启用/禁用状态过滤
    const enable = request.query.enable ? (request.query.enable as string).split(',')[0] : '0'
    // 启用/禁用状态过滤
    if (enable) {
      where.enable = Number.parseInt(enable)
    }
    // 排序
    const orderBy = request.query.orderBy as string || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    let result: PageResult<(envsModel & envsGroupModel)>
    if (category === EnvTypes.COMPOSITE) {
      result = await db.envsGroup.$page({
        where,
        page: request.query.page as string,
        size: request.query.size as string,
        orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
        include: {
          envs: true,
        },
      });
      (result.data as any) = (result.data as any).map((item) => ({
        ...item,
        envs: item.envs.length,
      }))
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
    validateParams(request, [
      ['query', 'name', [false, 'string']],
      ['query', 'type', [false, 'string']],
      ['query', 'description', [false, 'string']],
    ])
    const { name, type, description } = request.query
    if (!name && !type && !description) {
      throw new Error('至少需要提供 name、type、description 的其中一个参数')
    }
    const result: (envsGroupModel | envsModel)[] = []
    // 构建查询条件
    const queryConditions: (envsWhereInput & envsGroupWhereInput)[] = []
    if (type) {
      queryConditions.push({ type: { contains: type as string } }) // 优先使用 type
    }
    else if (name) {
      queryConditions.push({ type: { contains: name as string } })
    }
    if (description) {
      queryConditions.push({ description: { contains: description as string } })
    }
    // 查询 envs 表
    const envs_result = await db.envs.$list({
      group_id: 0,
      AND: queryConditions,
    }) || []
    if (envs_result.length > 0) {
      result.push(...envs_result)
    }
    // 查询 envsGroup 表
    const envsGroupResult = await db.envsGroup.$list({
      id: { not: 0 },
      AND: queryConditions,
    }, undefined, { include: { envs: true } }) || []
    if (envsGroupResult.length > 0) {
      // 替换关联数据为它的长度
      const format_data = envsGroupResult.map((item: any) => {
        if (Array.isArray(item?.envs)) {
          item.envs = item.envs.length
        }
        return item
      })
      result.push(...format_data)
    }
    result.push(...envsGroupResult)
    // 二次过滤（注：SQLite 的 contains 操作符不区分大小写）
    const filteredData = result.filter((item: envsModel) => {
      const matchesName = name ? item.type.includes(name as string) : true
      const matchesDescription = description ? item.description.includes(description as string) : true
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
          category = (data as envsModel).group_id === 0 ? EnvTypes.ORDINARY : EnvTypes.COMPOSITE_VALUE
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
    validateParams(request, [
      ['query', 'id', [true, 'string']],
      ['query', 'value', [false, 'string']],
      ['query', 'remark', [false, 'string']],
    ])
    const { id, value, remark } = request.query
    if (!/^\d+$/.test(id as string) || Number.parseInt(id as string) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    if (!value && !remark) {
      throw new Error('至少需要提供 value、remark 的其中一个参数')
    }
    // 构建查询条件
    const queryConditions: envsWhereInput[] = []
    if (value) {
      queryConditions.push({ value: { contains: value as string } })
    }
    if (remark) {
      queryConditions.push({ remark: { contains: remark as string } })
    }
    // 查询 envs 表
    const result = await db.envs.$list({
      group_id: Number.parseInt(id as string),
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
    validateParams(request, [
      ['query', 'category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
      ['query', 'id', [true, 'string']],
    ])
    const { category, id } = request.query
    if (!/^\d+$/.test(id as string) || Number.parseInt(id as string) <= 0) {
      throw new Error('参数 id 无效（参数值类型错误）')
    }
    let record: envsModel | (ComboEnvsGroupModel)
    if (category === EnvTypes.COMPOSITE) {
      record = await db.envsGroup.$getById(String(id), undefined, { include: { envs: true } })
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
      // 检查变量重名
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
      // 检查变量重名
      if (obj.type) {
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
  const category: EnvTypes = request.body.category
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
      ['body', 'compositeId', [false, 'number']],
      ['body', 'data', [true, 'object']],
    ])
    let data: (envsModel | ComboEnvsGroupModel)[]
    if (Array.isArray(request.body.data)) {
      data = request.body.data.map((e: any) => Object.assign({}, e))
    }
    else {
      data = [Object.assign({}, request.body.data)]
    }
    // 过滤数据
    let validateRules: ValidateObjectParamType[] = []
    let compositeId!: number
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
        compositeId = request.body.compositeId
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
    const formatData: (envsModel | ComboEnvsGroupModel)[] = []
    for (let obj of data) {
      // 属性校验
      validateObject(obj, validateRules)
      // clean
      obj = cleanProperties(obj, fields)
      // 检查变量重名
      if ([EnvTypes.ORDINARY, EnvTypes.COMPOSITE].includes(category)) {
        await checkVaribleExsit(obj.type)
      }
      // 补齐参数
      if (category === EnvTypes.ORDINARY) {
        (obj as envsModel).group_id = 0
      }
      else if (category === EnvTypes.COMPOSITE_VALUE) {
        (obj as envsModel).group_id = compositeId
        obj.type = '' // 复合变量值的 type 为空
      }
      formatData.push(obj)
    }
    let result: (envsModel | ComboEnvsGroupModel)[]
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
  const category = request.body.category
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'category', [true, [EnvTypes.ORDINARY, EnvTypes.COMPOSITE, EnvTypes.COMPOSITE_VALUE]]],
      ['body', 'data', [true, 'object']],
    ])
    let data: (envsModel | ComboEnvsGroupModel)[]
    if (Array.isArray(request.body.data)) {
      data = request.body.data.map((e: any) => Object.assign({}, e))
    }
    else {
      data = [Object.assign({}, request.body.data)]
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
    const exist_group_ids: number[] = [] // 已存在的复合变量(组) id（临时）
    const formatData: (envsModel | ComboEnvsGroupModel)[] = []
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
        if (!exist_group_ids.includes((obj as envsModel).group_id)) {
          if (((await db.envsGroup.$list({
            id: (obj as envsModel).group_id,
          })) || []).length > 0) {
            exist_group_ids.push(obj.id)
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
    const result: (envsModel | ComboEnvsGroupModel)[] = []
    for (const item of formatData) {
      let r: (envsModel | ComboEnvsGroupModel)
      if (category === EnvTypes.COMPOSITE) {
        r = await db.envsGroup.$upsertById(item as envsGroupModel)
      }
      else {
        r = await db.envs.$upsertById(item as envsModel)
      }
      result.push(r)
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
    validateParams(request, [
      ['body', 'id', [true, 'number | number[]']],
      ['body', 'status', [true, [1, 0]]],
      ['body', 'isComposite', [false, 'boolean']],
    ])
    const id = request.body.id
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    const status = request.body.status as 0 | 1
    const isComposite = request.body.isComposite as boolean
    for (const id of ids) {
      let record: envsModel | ComboEnvsGroupModel | null
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
    validateParams(request, [
      ['body', 'id', [true, 'number | number[]']],
    ])
    const id = request.body.id
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
    validateParams(request, [
      ['body', 'id', [true, 'number | number[]']],
    ])
    const id = request.body.id
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
    validateParams(request, [
      ['body', 'id', [true, 'number | number[]']],
      ['body', 'isComposite', [false, 'boolean']],
    ])
    const id = request.body.id
    const ids = Array.isArray(id) ? id : [id]
    ids.forEach((id) => {
      if (id <= 0) {
        throw new Error('参数 id 无效（参数值类型错误）')
      }
    })
    const isComposite = request.body.isComposite as boolean
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
    validateParams(request, [
      ['body', 'id', [true, 'number']],
    ])
    const id = request.body.id
    let order = request.body.order
    if (id <= 0) {
      response.send(API_STATUS_CODE.fail('参数 id 无效（参数值类型错误）'))
      return
    }
    if (!order && !request.body.moveToEnd) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await db.envsGroup.$page({ where: { id: { not: 0 } }, orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        response.send(API_STATUS_CODE.fail('未找到最大排序值'))
        return
      }
    }
    response.send(API_STATUS_CODE.okData(await updateSortById(id, order)))
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
    validateParams(request, [
      ['body', 'id', [true, 'number']],
    ])
    const id = request.body.id
    let order = request.body.order
    if (!order && !request.body.moveToEnd) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await db.envs.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        response.send(API_STATUS_CODE.fail('未找到最大排序值'))
        return
      }
    }
    response.send(API_STATUS_CODE.okData(await updateItemSortById(id, order)))
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
    validateParams(request, [
      ['body', 'id', [true, 'number']],
      ['body', 'isComposite', [false, 'boolean']],
      ['body', 'order', [false, 'number']],
      ['body', 'moveToEnd', [false, 'boolean']],
    ])
    const id = request.body.id
    let order = request.body.order
    if (!order && !request.body.moveToEnd) {
      response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
      return
    }
    if (order && order <= 0) {
      response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
      return
    }
    const isComposite = request.body.isComposite as boolean
    if (isComposite) {
      const envsGroupRecord = await db.envsGroup.$getById(id)
      if (!envsGroupRecord) {
        response.send(API_STATUS_CODE.fail('变量不存在'))
        return
      }
      // 移动到最后
      if (request.body.moveToEnd) {
        const data = await db.envsGroup.$page({ where: { id: { not: 0 } }, orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
        order = data.data[0]?.sort
        if (!order && order !== 0) {
          response.send(API_STATUS_CODE.fail('未找到最大排序值'))
          return
        }
      }
      response.send(API_STATUS_CODE.okData(await updateSortById(id, order)))
    }
    else {
      const envsRecord = await db.envs.$getById(id)
      if (!envsRecord) {
        response.send(API_STATUS_CODE.fail('变量不存在'))
        return
      }
      // 移动到最后
      if (request.body.moveToEnd) {
        const data = await db.envs.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
        order = data.data[0]?.sort
        if (!order && order !== 0) {
          response.send(API_STATUS_CODE.fail('未找到最大排序值'))
          return
        }
      }
      response.send(API_STATUS_CODE.okData(await updateItemSortById(id, order)))
    }
    await onChange(!isComposite)
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

async function fixOrder() {
  await db.$executeRaw`
      UPDATE envsGroup
      SET sort = t.row_num
      FROM (SELECT rowid, id, row_number() over ( order by sort) as row_num
            FROM envsGroup
            WHERE id != 0) t
      WHERE t.id = envsGroup.id`
}

async function updateSortById(id: number, newOrder: number) {
  const oldRecord = await db.envsGroup.$getById(id) as ComboEnvsGroupModel
  if (newOrder === oldRecord.sort) {
    return true
  }
  const args = newOrder > oldRecord.sort
    ? [oldRecord.sort, newOrder, -1, oldRecord.sort + 1, newOrder]
    : [oldRecord.sort, newOrder, 1, newOrder, oldRecord.sort - 1]

  await db.$executeRaw`BEGIN TRANSACTION;`
  if (newOrder > oldRecord.sort) {
    await db.$executeRaw`UPDATE envsGroup
                         SET sort = sort + ${args[2]}
                         WHERE sort > ${oldRecord.sort}
                           AND sort <= ${newOrder}
                           AND id != 0`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE envsGroup
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder}
                           AND sort < ${oldRecord.sort}
                           AND id != 0`
  }
  await db.$executeRaw`UPDATE envsGroup
                       SET sort = ${newOrder}
                       WHERE id = ${id}`
  await db.$executeRaw`COMMIT;`

  return true
}

async function fixItemOrder() {
  await db.$executeRaw`
      UPDATE envs
      SET sort = t.row_num
      FROM (SELECT id, row_number() over (PARTITION BY group_id order by sort) as row_num
            FROM envs) t
      WHERE t.id = envs.id`
}

async function updateItemSortById(id: number, newOrder: number) {
  const oldRecord = await db.envs.$getById(id) as envsModel
  if (newOrder === oldRecord.sort) {
    return true
  }
  const args = newOrder > oldRecord.sort
    ? [oldRecord.sort, newOrder, -1, oldRecord.sort + 1, newOrder, oldRecord.group_id]
    : [oldRecord.sort, newOrder, 1, newOrder, oldRecord.sort - 1, oldRecord.group_id]

  await db.$executeRaw`BEGIN TRANSACTION;`
  if (newOrder > oldRecord.sort) {
    await db.$executeRaw`UPDATE envs
                         SET sort = sort + ${args[2]}
                         WHERE sort > ${oldRecord.sort}
                           AND sort <= ${newOrder}
                           AND group_id = ${args[5]}`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE envs
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder}
                           AND sort < ${oldRecord.sort}
                           AND group_id = ${args[5]}`
  }
  await db.$executeRaw`UPDATE envs
                       SET sort = ${newOrder}
                       WHERE id = ${id}`
  await db.$executeRaw`COMMIT;`

  return true
}

async function checkVaribleExsit(name: string) {
  if (((await db.envsGroup.$list({
    id: { not: 0 },
    type: name,
  })) || []).length > 0) {
    throw new Error(`已存在复合变量 ${name}`)
  }
  if (((await db.envs.$list({
    type: name,
  })) || []).length > 0) {
    throw new Error(`已存在普通变量 ${name}`)
  }
}

export {
  api as API,
  apiOpen as OpenAPI,
}
