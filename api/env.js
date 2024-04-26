const express = require('express')
const api = express()
const { API_STATUS_CODE } = require('../core/http')

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
  const envgs = await db.envs_group.$list({}, {
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
    // 过滤掉特殊记录
    where.id = { not: 0 }
    // 启用/禁用状态过滤
    if (enable.length > 0) {
      enable.forEach((enable) => {
        or.push({ enable: { equals: parseInt(enable) } })
      })
    }
    // 搜索过滤
    if (request.query.search) {
      where.AND = {
        OR: [
          { type: { contains: request.query.search } },
          // { tag_list: { contains: request.query.search } },
        ],
      }
    }
    if (or.length > 0) {
      where.OR = or
    }
    // for (const fieldsKey in db.envs.fields) {
    //   if (where[fieldsKey]) {
    //     where[fieldsKey] = { contains: where[fieldsKey] }
    //   }
    // }
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
    // 默认值
    if (request.query.group_id) {
      where.group_id = { equals: parseInt(request.query.group_id) }
    }
    // 启用/禁用状态过滤
    if (enable.length > 0) {
      enable.forEach((enable) => {
        or.push({ enable: { equals: parseInt(enable) } })
      })
    }
    // 搜索过滤
    if (request.query.search) {
      where.AND = {
        OR: request.query.group_id === '0' ? [
          { type: { contains: request.query.search } },
          // { tag_list: { contains: request.query.search } },
          { value: { contains: request.query.search } },
        ] : [
          { value: { contains: request.query.search } },
        ],
      }
    }
    if (or.length > 0) {
      where.OR = or
    }
    // for (const fieldsKey in db.envs.fields) {
    //   if (where[fieldsKey]) {
    //     where[fieldsKey] = { contains: where[fieldsKey] }
    //   }
    // }
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

api.post('/save', async (request, response) => {
  try {
    const env = request.body
    // 新增判断是否重复添加
    if (!env.id) {
      if (((await db.envs_group.$list({
        type: env.type,
      })) || []).length > 0) {
        response.send(API_STATUS_CODE.fail('变量已存在，请勿重复添加！'))
        return
      }
      if (((await db.envs.$list({
        type: env.type,
      })) || []).length > 0) {
        response.send(API_STATUS_CODE.fail('已存在名称相同的普通变量，请勿重复添加！'))
        return
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
        type: env.type,
      })) || []).length > 0) {
        response.send(API_STATUS_CODE.fail('已存在名称相同的复合变量，请勿重复添加！'))
        return
      }
      if (((await db.envs.$list({
        type: env.type,
      })) || []).length > 0) {
        response.send(API_STATUS_CODE.fail('变量已存在，请勿重复添加！'))
        return
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
  const id = request.body.id
  if (!id) {
    response.send(API_STATUS_CODE.fail('ID不能为空'))
  }
  let ids
  try {
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
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
  const id = request.body.id
  if (!id) {
    response.send(API_STATUS_CODE.fail('ID不能为空'))
  }
  let ids
  try {
    if (Array.isArray(id)) {
      ids = id
    } else {
      ids = [id]
    }
    await db.envs.$deleteById(ids)
    response.send(API_STATUS_CODE.ok(true))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
    await onChange(true)
  }
})
api.put('/order', async (request, response) => {
  try {
    const id = request.body.id
    let order = request.body.order
    if (!id || (!order && !request.body.moveToEnd)) {
      response.send(API_STATUS_CODE.fail('请提供完整参数'))
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await db.envs_group.$page({
        orderBy: [
          { sort: 'desc' },
        ],
        page: 1,
        size: 1,
      })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        response.send(API_STATUS_CODE.fail('未找到最大排序值'))
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
    const id = request.body.id
    let order = request.body.order
    if (!id || (!order && !request.body.moveToEnd)) {
      response.send(API_STATUS_CODE.fail('请提供完整参数'))
    }
    // 移动到最后
    if (request.body.moveToEnd) {
      const data = await db.envs.$page({
        orderBy: [
          { sort: 'desc' },
        ],
        page: 1,
        size: 1,
      })
      order = data.data[0]?.sort
      if (!order && order !== 0) {
        response.send(API_STATUS_CODE.fail('未找到最大排序值'))
      }
    }
    response.send(API_STATUS_CODE.okData(await updateItemSortById(id, order)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  } finally {
    await onChange(true)
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
