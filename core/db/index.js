const { PrismaClient } = require('@prisma/client')
const { pagination } = require('prisma-extension-pagination')
const { logger } = require('../logger')
const debug = process.env.DEBUG_SQL === 'true'

const prisma = new PrismaClient()
prisma.$use(async (params, next) => {
  const before = Date.now()
  const result = await next(params)
  const after = Date.now()
  debug && logger.info(`Query ${params.model}.${params.action} 用时 ${after - before}ms,${JSON.stringify(params.args || {})}`)
  return result
})
// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function () {
  return this.toString()
}
const prisma1 = prisma
  .$extends(pagination())
  .$extends({
    name: 'db',
    model: {
      $allModels: {
        clean(o) {
          if (!o) {
            return o
          }
          const field = Object.keys(this.fields)
          o = Object.keys(o).filter((key) => {
            return field.includes(key)
          }).reduce((obj, key) => {
            obj[key] = o[key]
            return obj
          }, {})
          return o
        },
        clean1(o) {
          if (!o) {
            return o
          }
          const field = ['AND', 'OR', 'NOT', ...Object.keys(this.fields)]
          return Object.keys(o).filter((key) => {
            return field.includes(key)
          }).reduce((obj, key) => {
            if (o[key] !== '') {
              obj[key] = o[key]
            }
            return obj
          }, {})
        },
        cleanId(o, name) {
          if (!o) {
            return o
          }
          const field = this.fields[name]
          if (!field) {
            return o
          }
          switch (field.typeName) {
            case 'Int':
              if (typeof o === 'number') {
                return o
              }
              return parseInt(o)
            case 'String':
              if (typeof o === 'string') {
                return o
              }
              return String(o)
            default:
              return o
          }
        },
        create(o) {
          o.data = this.clean(o.data)
          return prisma[this.name].create(o)
        },
        $create(o, options = {}) {
          o = this.clean(o)
          return prisma[this.name].create({ data: o, ...options })
        },
        update(o) {
          o.data = this.clean(o.data)
          return prisma[this.name].update(o)
        },
        $updateById(o, idName = 'id', options = {}) {
          const id = this.cleanId(o[idName], idName)
          if (id === undefined || id === null || id === '') {
            throw new Error('id不能为空')
          }
          o.data = this.clean(o.data)
          return prisma[this.name].update({
            where: { [idName]: id },
            data: o.data,
            ...options,
          })
        },
        upsert(o) {
          o.create = this.clean(o.create)
          o.update = this.clean(o.update)
          return prisma[this.name].upsert(o)
        },
        $upsert(o) {
          o.create = this.clean(o.data)
          o.update = o.create
          delete o.data
          return prisma[this.name].upsert(o)
        },
        $upsertById(o, idName = 'id', options = {}) {
          const id = this.cleanId(o[idName], idName)
          if (id === undefined || id === null || id === '') {
            return this.$create(o, options)
          }
          return prisma[this.name].upsert({
            where: { [idName]: id },
            create: o,
            update: o,
            ...options,
          })
        },
        async $list(o, orderBy = {}, options = {}) {
          return this.findMany({ where: this.clean1(o), orderBy, ...options })
        },
        /**
         * @param {{select, where, orderBy, page, size}} o
         * @return {Promise<{total: *, data: *, size: number, page: *}>}
         */
        async $page(o) {
          const size = parseInt(o.size || '20')
          const page = parseInt(o.page || '1')
          o.where = this.clean1(o.where)
          delete o.size
          delete o.page
          const r = await this
            .paginate(o)
            .withPages({ limit: size, page, includePageCount: true })
          return {
            data: r[0],
            total: r[1].totalCount,
            page: r[1].currentPage,
            size,
          }
        },
        async $getById(id, idName = 'id', options = {}) {
          if (!idName) {
            if (this.idField) {
              idName = this.idField
            }
          }
          id = this.cleanId(id, idName)
          if (id === undefined || id === null || id === '') {
            return null
          }
          return await this.findFirst({ where: { [idName]: id }, ...options })
        },
        async $deleteById(id, idName = 'id', options = {}) {
          if (!idName) {
            if (this.idField) {
              idName = this.idField
            }
          }
          try {
            if (Array.isArray(id)) {
              if (id.length === 0) {
                return false
              }
              return await this.deleteMany({ where: { [idName]: { in: id.map((i) => this.cleanId(i, idName)) } }, ...options })
            }
            if (id === undefined || id === null || id === '') {
              return false
            }
            return await this.delete({ where: { [idName]: this.cleanId(id, idName) }, ...options })
          } catch (e) {
            if (e.code === 'P2025') {
              return false
            }
            throw e
          }
        },
      },
    },
  })
prisma1.$RAW = prisma

/**
 * @type {import("@prisma/client/index.d.ts").PrismaClient}
 */
module.exports = prisma1
