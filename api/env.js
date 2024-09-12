const express = require('express')
const api = express()
const apiOpen = express()
const { API_STATUS_CODE } = require('../core/http')
const { validateParams, validatePageParams, validateObject, cleanProperties } = require('../core/utils')

const db = require('../core/db')
const { generateEnvSh } = require('../core/env/generate')

// 初始化
;(async function init() {
  await db.envs_group.$upsertById({
    id: 0,
    type: '_SPECIAL_',
    enable: 0,
    sort: 99999,
  })
}())

// 数据更新回调
async function onChange(isItem) {
  if (typeof isItem === 'boolean') {
    if (isItem) {
      await fixItemOrder()
    } else {
      await fixOrder()
    }
  } else {
    await fixOrder()
    await fixItemOrder()
  }
  const envgs = await db.envs_group.$list({
    id: { not: 0 },
  }, {
    sort: 'asc', // 升序
  }, {
    include: {
      envs: true,
    },
  })
  const envs = await db.envs.$list({
    group_id: 0,
  })
  generateEnvSh(envgs, envs)
}

onChange()

api.get('/page', async (request, response) => {
  try {
    const enable = request.query.enable ? request.query.enable.split(',') : []
    const where = {}
    const or = []
    // 启用/禁用状态过滤
    if (enable.length > 0) {
      enable.forEach((enable) => {
        or.push({ enable: { equals: parseInt(enable) } })
      })
    }
    // 过滤掉特殊记录
    where.id = { not: 0 }
    // 搜索过滤
    if (request.query.search) {
      where.AND = {
        OR: [
          { type: { contains: request.query.search } },
          { description: { contains: request.query.search } },
        ],
      }
    }
    if (or.length > 0) {
      where.OR = or
    }
    // 排序
    const orderBy = request.query.orderBy || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    const result = await db.envs_group.$page({
      where,
      page: request.query.page,
      size: request.query.size,
      orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
      include: {
        envs: true,
      },
    })
    // 替换关联数据为它的长度
    result.data = result.data.map((item) => ({
      ...item,
      envs: item.envs.length,
    }))
    response.send(API_STATUS_CODE.okData(result))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

api.get('/pageItem', async (request, response) => {
  try {
    const enable = request.query.enable ? request.query.enable.split(',') : []
    const where = {}
    const or = []
    // 启用/禁用状态过滤
    if (enable.length > 0) {
      enable.forEach((enable) => {
        or.push({ enable: { equals: parseInt(enable) } })
      })
    }
    // 默认值
    if (request.query.group_id) {
      where.group_id = { equals: parseInt(request.query.group_id) }
    }
    // 搜索过滤
    if (request.query.search) {
      where.AND = {
        OR: request.query.group_id === '0' ? [
          { type: { contains: request.query.search } },
          { value: { contains: request.query.search } },
          { description: { contains: request.query.search } },
        ] : [
          { value: { contains: request.query.search } },
          { remark: { contains: request.query.search } },
        ],
      }
    }
    if (or.length > 0) {
      where.OR = or
    }
    // 排序
    const orderBy = request.query.orderBy || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    response.send(API_STATUS_CODE.okData(await db.envs.$page({
      where,
      page: request.query.page,
      size: request.query.size,
      orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
    })))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

apiOpen.get('/v1/page', async (request, response) => {
  try {
    // 传参校验
    validatePageParams(request, ['sort', 'update_time'])
    validateParams(request, [
      ['query', 'category', [true, ['ordinary', 'composite', 'composite_value']]],
      ['query', 'enable', [false, ['1', '0']]],
    ])
    const where = {}
    const or = []
    const category = request.query.category
    switch (category) {
      case 'ordinary':
        // 默认值
        where.group_id = { equals: 0 }
        // 搜索过滤
        if (request.query.search) {
          where.AND = {
            OR: [
              { type: { contains: request.query.search } },
              { value: { contains: request.query.search } },
            ],
          }
        }
        break
      case 'composite':
        // 过滤掉特殊记录
        where.id = { not: 0 }
        // 搜索过滤
        if (request.query.search) {
          where.AND = {
            OR: [
              { type: { contains: request.query.search } },
            ],
          }
        }
        break
      case 'composite_value':
        // 默认值
        validateParams(request, [
          ['query', 'compositeId', [true, 'string']],
        ])
        if (parseInt(request.query.compositeId) <= 0) {
          throw new Error('参数 compositeId 无效（参数值类型错误）')
        }
        where.group_id = { equals: parseInt(request.query.compositeId) }
        // 搜索过滤
        if (request.query.search) {
          where.AND = {
            OR: [{ value: { contains: request.query.search } }],
          }
        }
        break
    }
    // 启用/禁用状态过滤
    const enable = request.query.enable ? request.query.enable.split(',') : []
    if (enable.length > 0) {
      enable.forEach((value) => {
        or.push({ enable: { equals: parseInt(value) } })
      })
    }
    // 排序
    const orderBy = request.query.orderBy || 'sort'
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    if (or.length > 0) {
      where.OR = or
    }
    let result
    if (category === 'composite') {
      result = await db.envs_group.$page({
        where,
        page: request.query.page,
        size: request.query.size,
        orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
        include: {
          envs: true,
        },
      })
      // 替换关联数据为它的长度
      result.data = result.data.map((item) => ({
        ...item,
        envs: item.envs.length,
      }))
    } else {
      result = await db.envs.$page({
        where,
        page: request.query.page,
        size: request.query.size,
        orderBy: { [orderBy]: (desc ? 'desc' : 'asc') },
      })
    }
    // 返回数据
    response.send(API_STATUS_CODE.okData(result))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/query', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['query', 'name', [true, 'string']],
    ])
    const name = request.query.name
    const result = []
    const envs_result = await db.envs.$list({
      group_id: 0,
      AND: [
        { type: { contains: name } },
      ],
    }) || []
    if (envs_result.length > 0) {
      result.push(...envs_result)
    }
    const envs_group_result = await db.envs_group.$list({
      id: { not: 0 },
      AND: [
        { type: { contains: name } },
      ],
    }, undefined, { include: { envs: true } }) || []
    if (envs_group_result.length > 0) {
      // 替换关联数据为它的长度
      const format_data = envs_group_result.map((item) => {
        if (Array.isArray(item?.envs)) {
          item.envs = item.envs.length
        }
        return item
      })
      result.push(...format_data)
    }
    // 二次过滤（注：SQLite 的 contains 操作符不区分大小写）
    const filteredData = result.filter((item) => item.type.includes(name))
    // 返回数据
    if (filteredData.length <= 0) {
      return response.send(API_STATUS_CODE.okData([]))
    } else {
      const datas = filteredData.map((data) => {
        const fields = Object.keys(data)
        let category
        if (fields.includes('group_id')) {
          category = data.group_id === 0 ? 'ordinary' : 'composite_value'
        } else {
          category = 'composite'
        }
        return { category, data }
      })
      response.send(API_STATUS_CODE.okData(datas))
    }
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/queryMember', async (request, response) => {
  try {
    // 传参校验
    validateParams(request, [
      ['query', 'id', [true, 'string']],
      ['query', 'value', [true, 'string']],
    ])
    const result = await db.envs.$list({
      group_id: parseInt(request.query.id),
      AND: [
        { value: { contains: request.query.value } },
      ],
    }) || []
    // 返回数据
    response.send(API_STATUS_CODE.okData(result))
  } catch (e) {
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
    const saveEnv = await db.envs_group.$upsertById(env)
    if (env.envs && env.envs) {
      await db.envs.deleteMany({
        where: {
          group_id: parseInt(env.id),
        },
      })
      env.envs.map((e) => {
        if (!e.order) {
          e.order = 99999
        }
        if (env.group_id) {
          e.group_id = env.group_id
        } else {
          e.group_id = saveEnv.group_id
        }
        if (!e.sort) {
          e.sort = 99999
        }
        return e
      }).forEach((e) => db.envs.$create(e))
    }
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
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
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
    await onChange(true)
  }
})

api.post('/create', async (request, response) => {
  try {
    let data
    if (Array.isArray(request.body)) {
      data = request.body.map((e) => Object.assign({}, e))
    } else {
      data = [Object.assign({}, request.body)]
    }
    const formatData = []
    for (const obj of data) {
      // 检查变量重名
      await checkVaribleExsit(obj.type)
      formatData.push(obj)
    }
    // 操作数据库
    let result
    if (data.length === 1) {
      result = await db.envs_group.$create(formatData[0])
    } else {
      result = await db.envs_group.$createMany(formatData)
    }
    response.send(API_STATUS_CODE.okData(result))
    await onChange(false)
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.post('/createItem', async (request, response) => {
  try {
    let data
    if (Array.isArray(request.body)) {
      data = request.body.map((e) => Object.assign({}, e))
    } else {
      data = [Object.assign({}, request.body)]
    }
    const formatData = []
    for (const obj of data) {
      // 检查变量重名
      if (obj.type) {
        await checkVaribleExsit(obj.type)
      }
      formatData.push(obj)
    }
    // 操作数据库
    let result
    if (data.length === 1) {
      result = await db.envs.$create(formatData[0])
    } else {
      result = await db.envs.$createMany(formatData)
    }
    response.send(API_STATUS_CODE.okData(result))
    await onChange(true)
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/create', async (request, response) => {
  const category = request.body.category
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'category', [true, ['ordinary', 'composite', 'composite_value']]],
      ['body', 'compositeId', [false, 'number']],
      ['body', 'data', [true, 'object']],
    ])
    let data
    if (Array.isArray(request.body.data)) {
      data = request.body.data.map((e) => Object.assign({}, e))
    } else {
      data = [Object.assign({}, request.body.data)]
    }
    // 过滤数据
    let validateRules = []
    let compositeId
    switch (category) {
      case 'ordinary':
        validateRules = [
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['value', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case 'composite':
        validateRules = [
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['separator', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case 'composite_value':
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
    const formatData = []
    for (let obj of data) {
      // 属性校验
      validateObject(obj, validateRules)
      // clean
      obj = cleanProperties(obj, fields)
      // 检查变量重名
      if (['ordinary', 'composite'].includes(category)) {
        await checkVaribleExsit(obj.type)
      }
      // 补齐参数
      if (category === 'ordinary') {
        obj.group_id = 0
      } else if (category === 'composite_value') {
        obj.group_id = compositeId
        obj.type = '' // 复合变量值的 type 为空
      }
      formatData.push(obj)
    }
    // 操作数据库
    let result
    if (data.length === 1) {
      result = await db[category === 'composite' ? 'envs_group' : 'envs'].$create(formatData[0])
    } else {
      result = await db[category === 'composite' ? 'envs_group' : 'envs'].$createMany(formatData)
    }
    response.send(API_STATUS_CODE.okData(result))
    await onChange(category !== 'composite')
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.post('/v1/update', async (request, response) => {
  const category = request.body.category
  try {
    // 传参校验
    validateParams(request, [
      ['body', 'category', [true, ['ordinary', 'composite', 'composite_value']]],
      ['body', 'data', [true, 'object']],
    ])
    let data
    if (Array.isArray(request.body.data)) {
      data = request.body.data.map((e) => Object.assign({}, e))
    } else {
      data = [Object.assign({}, request.body.data)]
    }
    // 过滤数据
    let validateRules = []
    switch (category) {
      case 'ordinary':
        validateRules = [
          ['id', [true, 'number']],
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['value', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case 'composite':
        validateRules = [
          ['id', [true, 'number']],
          ['type', [true, 'string']],
          ['description', [false, 'string']],
          ['separator', [false, 'string']],
          ['enable', [false, [1, 0]]],
        ]
        break
      case 'composite_value':
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
    const exist_group_ids = [] // 已存在的复合变量(组) id（临时）
    const formatData = []
    for (let obj of data) {
      // 属性校验
      validateObject(obj, validateRules)
      // clean
      obj = cleanProperties(obj, fields)
      // 检测
      if (category === 'composite_value') {
        if (obj.id <= 0) {
          throw new Error('参数 id 无效（参数值类型错误）')
        }
        if (obj.group_id <= 0) {
          throw new Error('参数 group_id 无效（参数值类型错误）')
        }
        // 检查变量是否存在
        const envsItems = await db.envs.$list({ id: obj.id }) || []
        if (envsItems.length <= 0) {
          throw new Error(`参数 id 无效，复合变量的值 ${obj.id} 不存在`)
        }
        // 检查复合变量(组)是否存在（仅一次）
        if (!exist_group_ids.includes(obj.group_id)) {
          if (((await db.envs_group.$list({
            id: obj.group_id,
          })) || []).length > 0) {
            exist_group_ids.push(obj.id)
          } else {
            throw new Error(`参数 group_id 无效，复合变量(组) ${obj.group_id} 不存在`)
          }
        }
        // 补齐参数
        obj.type = '' // 复合变量值的 type 为空
      } else {
        if (obj.id <= 0) {
          throw new Error('参数 id 无效（参数值类型错误）')
        }
        if (category === 'ordinary') {
          // 检查变量是否存在
          const envsItems = await db.envs.$list({ id: obj.id }) || []
          if (envsItems.length <= 0) {
            throw new Error(`参数 id 无效，普通变量 ${obj.id} 不存在`)
          }
          // 补齐参数
          obj.group_id = 0
        } else if (category === 'composite') {
          // 检查变量是否存在
          const envsGroupItems = await db.envs_group.$list({ id: obj.id }) || []
          if (envsGroupItems.length <= 0) {
            throw new Error(`参数 id 无效，复合变量(组) ${obj.id} 不存在`)
          }
        }
      }
      formatData.push(obj)
    }
    // 操作数据库
    let result
    if (formatData.length === 1) {
      result = [await db[category === 'composite' ? 'envs_group' : 'envs'].$upsertById(formatData[0])]
    } else {
      result = []
      for (const item of formatData) {
        const r = await db[category === 'composite' ? 'envs_group' : 'envs'].$upsertById(item)
        if (typeof r === 'string') {
          result.push({ id: item.id, error: r })
        } else {
          result.push(r)
        }
      }
    }
    response.send(API_STATUS_CODE.okData(result))
    await onChange(category !== 'composite')
  } catch (e) {
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
      const record = await db.envs_group.$getById(id)
      if (!record) {
        throw new Error('变量不存在')
      }
      record.enable = status
      await db.envs_group.$upsertById(record)
    }
    response.send(API_STATUS_CODE.ok())
    await onChange(false)
  } catch (e) {
    return response.send(API_STATUS_CODE.fail(e.message || e))
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
  } catch (e) {
    return response.send(API_STATUS_CODE.fail(e.message || e))
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
    const status = request.body.status
    const isComposite = request.body.isComposite
    for (const id of ids) {
      const record = await db[isComposite ? 'envs_group' : 'envs'].$getById(id)
      if (!record) {
        throw new Error('变量不存在')
      }
      record.enable = status
      await db[isComposite ? 'envs_group' : 'envs'].$upsertById(record)
    }
    response.send(API_STATUS_CODE.ok())
    await onChange(!isComposite)
  } catch (e) {
    return response.send(API_STATUS_CODE.fail(e.message || e))
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
    await db.envs_group.$deleteById(ids)
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
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
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
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
    const isComposite = request.body.isComposite
    if (isComposite) {
      await db.envs.$deleteById(ids, 'group_id')
      await db.envs_group.$deleteById(ids)
    } else {
      await db.envs.$deleteById(ids)
    }
    response.send(API_STATUS_CODE.ok())
    await onChange(!isComposite)
  } catch (e) {
    return response.send(API_STATUS_CODE.fail(e.message || e))
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
      return response.send(API_STATUS_CODE.fail('参数 id 无效（参数值类型错误）'))
    }
    if (!order && !request.body.moveToEnd) {
      return response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await db.envs_group.$page({ where: { id: { not: 0 } }, orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
      }
    }
    response.send(API_STATUS_CODE.okData(await updateSortById(id, order)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
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
      return response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await db.envs.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
      }
    }
    response.send(API_STATUS_CODE.okData(await updateItemSortById(id, order)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
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
      return response.send(API_STATUS_CODE.fail('缺少必要的参数 order 或 moveToEnd'))
    }
    if (order && order <= 0) {
      return response.send(API_STATUS_CODE.fail('参数 order 无效（参数值类型错误）'))
    }
    const isComposite = request.body.isComposite
    if (isComposite) {
      const envsGroupRecord = await db.envs_group.$getById(id)
      if (!envsGroupRecord) {
        return response.send(API_STATUS_CODE.fail('变量不存在'))
      }
      // 移动到最后
      if (request.body.moveToEnd) {
        const data = await db.envs_group.$page({ where: { id: { not: 0 } }, orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
        order = data.data[0]?.sort
        if (!order && order !== 0) {
          return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
        }
      }
      response.send(API_STATUS_CODE.okData(await updateSortById(id, order)))
    } else {
      const envsRecord = await db.envs.$getById(id)
      if (!envsRecord) {
        return response.send(API_STATUS_CODE.fail('变量不存在'))
      }
      // 移动到最后
      if (request.body.moveToEnd) {
        const data = await db.envs.$page({ orderBy: [{ sort: 'desc' }], page: 1, size: 1 })
        order = data.data[0]?.sort
        if (!order && order !== 0) {
          return response.send(API_STATUS_CODE.fail('未找到最大排序值'))
        }
      }
      response.send(API_STATUS_CODE.okData(await updateItemSortById(id, order)))
    }
    await onChange(!isComposite)
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

async function fixOrder() {
  await db.$executeRaw`
            UPDATE envs_group
            SET sort = t.row_num
            FROM (SELECT rowid, id, row_number() over ( order by sort) as row_num
                  FROM envs_group WHERE id != 0) t
            WHERE t.id = envs_group.id`
}

async function updateSortById(id, newOrder) {
  const oldRecord = await db.envs_group.$getById(id)
  if (newOrder === oldRecord.sort) {
    return true
  }
  const args = newOrder > oldRecord.sort
    ? [oldRecord.sort, newOrder, -1, oldRecord.sort + 1, newOrder]
    : [oldRecord.sort, newOrder, 1, newOrder, oldRecord.sort - 1]

  await db.$executeRaw`BEGIN TRANSACTION;`
  if (newOrder > oldRecord.sort) {
    await db.$executeRaw`UPDATE envs_group
                         SET sort = sort + ${args[2]}
                         WHERE sort > ${oldRecord.sort} AND sort <= ${newOrder} AND id != 0`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE envs_group
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder} AND sort < ${oldRecord.sort} AND id != 0`
  }
  await db.$executeRaw`UPDATE envs_group
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

async function updateItemSortById(id, newOrder) {
  const oldRecord = await db.envs.$getById(id)
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
                         WHERE sort > ${oldRecord.sort} AND sort <= ${newOrder} AND group_id = ${args[5]}`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE envs
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder} AND sort < ${oldRecord.sort} AND group_id = ${args[5]}`
  }
  await db.$executeRaw`UPDATE envs
                       SET sort = ${newOrder}
                       WHERE id = ${id}`
  await db.$executeRaw`COMMIT;`

  return true
}

async function checkVaribleExsit(name) {
  if (((await db.envs_group.$list({
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

module.exports = {
  API: api,
  OpenAPI: apiOpen,
}
