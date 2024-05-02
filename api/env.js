const express = require('express')
const api = express()
const apiOpen = express()
const { API_STATUS_CODE, validateParams } = require('../core/http')

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
    validateParams(request, [
      ['query', 'type', [true, ['ordinary', 'composite', 'composite_value']]],
    ])
    const where = {}
    const or = []
    const type = request.query.type
    switch (type) {
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
          ['query', 'composite_id', [true, 'string']],
        ])
        if (request.query.composite_id <= 0) {
          throw new Error('参数 composite_id 无效（参数值类型错误）')
        }
        where.group_id = { equals: parseInt(request.query.composite_id) }
        // 搜索过滤
        if (request.query.search) {
          where.AND = {
            OR: [{ value: { contains: request.query.search } }],
          }
        }
        break
    }
    // 启用/禁用状态过滤
    validateParams(request, [
      ['query', 'enable', [false, ['1', '0']]],
    ])
    const enable = request.query.enable ? request.query.enable.split(',') : []
    if (enable.length > 0) {
      enable.forEach((value) => {
        or.push({ enable: { equals: parseInt(value) } })
      })
    }
    // 排序
    const orderBy = request.query.orderBy || 'sort'
    if (!['sort'].includes(orderBy)) {
      throw new Error('参数 orderBy 无效（参数值类型错误）')
    }
    let desc = true // desc 降序，asc 升序
    if (request.query.order === '0') {
      desc = false // 0 升序，1 降序
    }
    if (or.length > 0) {
      where.OR = or
    }
    let result
    if (type === 'composite') {
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
    response.send(API_STATUS_CODE.ok(result))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/queryName', async (request, response) => {
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
    }) || []
    if (envs_group_result.length > 0) {
      result.push(...envs_group_result)
    }
    // 过滤数据（注：SQLite 的 contains 操作符不区分大小写）
    const filteredData = result.filter((item) => item.type.includes(name))
    // 返回数据
    response.send(API_STATUS_CODE.ok(filteredData))
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
    response.send(API_STATUS_CODE.ok(result))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

api.post('/save', async (request, response) => {
  try {
    const env = request.body
    // 新增判断是否重复添加
    if (!env.id) {
      if (((await db.envs_group.$list({
        id: { not: 0 },
        type: env.type,
      })) || []).length > 0) {
        return response.send(API_STATUS_CODE.fail('变量已存在，请勿重复添加！'))
      }
      if (((await db.envs.$list({
        type: env.type,
      })) || []).length > 0) {
        return response.send(API_STATUS_CODE.fail('已存在名称相同的普通变量，请勿重复添加！'))
      }
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
    response.send(API_STATUS_CODE.ok(true))
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
      if (((await db.envs_group.$list({
        id: { not: 0 },
        type: env.type,
      })) || []).length > 0) {
        return response.send(API_STATUS_CODE.fail('已存在名称相同的复合变量，请勿重复添加！'))
      }
      if (((await db.envs.$list({
        type: env.type,
      })) || []).length > 0) {
        return response.send(API_STATUS_CODE.fail('变量已存在，请勿重复添加！'))
      }
    }
    if (!env.sort) {
      env.sort = 99999
    }
    await db.envs.$upsertById(env)
    response.send(API_STATUS_CODE.ok(true))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
    await onChange(true)
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
    response.send(API_STATUS_CODE.ok(true))
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
    response.send(API_STATUS_CODE.ok(true))
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
    if (request.body.isComposite) {
      await db.envs.$deleteById(ids, 'group_id')
      await db.envs_group.$deleteById(ids)
    } else {
      await db.envs.$deleteById(ids)
    }
    response.send(API_STATUS_CODE.ok(true))
    await onChange()
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
    if (request.body.isComposite) {
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
    await onChange()
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

module.exports.API = api
module.exports.OpenAPI = apiOpen
