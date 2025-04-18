import { logger } from '../logger'
import { Prisma, PrismaClient } from '@prisma/client'
import { pagination } from 'prisma-extension-pagination'
import type {
  envs as Envs,
  envs_group as EnvsGroup,
  message as Message,
  task_core as TaskCore,
  tasks as Tasks,
} from '@prisma/client'
import type {
  EnvsGroupModel,
  EnvsGroupResult,
  EnvsGroupSimpleResult,
  EnvsModel,
  MessageModel,
  PageParams,
  PageResult,
  PaginateResult,
  PrismaDelegate,
  TaskCoreModel,
  TasksModel,
  TasksResult,
} from './types'

const prisma = new PrismaClient({
  errorFormat: 'pretty',
})

// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function () {
  return this.toString()
}

interface PrismaModelMethods {
  findMany: <T extends Prisma.ModelName>(
    args: Prisma.Args<T, 'findMany'>
  ) => ReturnType<PrismaDelegate<T>['findMany']>
  findFirst: <T extends Prisma.ModelName>(
    args: Prisma.Args<T, 'findFirst'>
  ) => ReturnType<PrismaDelegate<T>['findFirst']>
  delete: <T extends Prisma.ModelName>(
    args: Prisma.Args<T, 'delete'>
  ) => ReturnType<PrismaDelegate<T>['delete']>
  deleteMany: <T extends Prisma.ModelName>(
    args: Prisma.Args<T, 'deleteMany'>
  ) => ReturnType<PrismaDelegate<T>['deleteMany']>

  clean: (o: any) => any
  clean1: (o: any) => any
  cleanId: (o: any, name: string) => any

  create: <T extends Prisma.ModelName>(
    o: Prisma.Args<T, 'create'>
  ) => ReturnType<PrismaDelegate<T>['create']>
  $create: <T extends Prisma.ModelName>(
    o: Prisma.Result<T, null, 'create'>,
    options?: Omit<Prisma.Args<T, 'create'>, 'data'>
  ) => ReturnType<PrismaDelegate<T>['create']>
  createMany: <T extends Prisma.ModelName>(
    o: Prisma.Args<T, 'createMany'>
  ) => ReturnType<PrismaDelegate<T>['createMany']>
  update: <T extends Prisma.ModelName>(
    o: Prisma.Args<T, 'update'>
  ) => ReturnType<PrismaDelegate<T>['update']>
  updateMany: <T extends Prisma.ModelName>(
    o: Prisma.Args<T, 'updateMany'>
  ) => ReturnType<PrismaDelegate<T>['updateMany']>
  upsert: <T extends Prisma.ModelName>(
    o: Prisma.Args<T, 'upsert'>
  ) => ReturnType<PrismaDelegate<T>['upsert']>
  paginate: <T extends Prisma.ModelName>(
    args: Prisma.Args<T, 'findMany'>
  ) => PaginateResult<Prisma.Result<T, null, 'findMany'>>
}

interface ExtendedModel {
  fields: Record<string, { typeName: string }>
  name: Prisma.ModelName
  idField?: string
}

type ExtensionThis = ExtendedModel &
  PrismaModelMethods &
  PrismaClient[Prisma.ModelName]

const debug = process.env.ARCADIA_SQL_DEBUG === 'true'
const extension = Prisma.defineExtension((client) => {
  return client.$extends({
    name: 'db',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const before = Date.now()
          const result = query(args)
          const after = Date.now()
          debug && logger.info(`Query ${model}.${operation} 用时 ${after - before}ms,${JSON.stringify(args || {})}`)
          return result
        },
      },
    },
    model: {
      $allModels: {
        clean(o: any) {
          const self = this as unknown as ExtensionThis
          if (!o)
            return o
          const field = Object.keys(self.fields)
          return Object.keys(o)
            .filter(key => field.includes(key))
            .reduce((obj, key) => {
              obj[key] = o[key]
              return obj
            }, {} as Record<string, any>)
        },
        clean1(o: any) {
          const self = this as unknown as ExtensionThis
          if (!o)
            return o
          const field = ['AND', 'OR', 'NOT', ...Object.keys(self.fields)]
          return Object.keys(o)
            .filter(key => field.includes(key))
            .reduce((obj, key) => {
              if (o[key] !== '') {
                obj[key] = o[key]
              }
              return obj
            }, {} as Record<string, any>)
        },
        cleanId(o: any, name: string) {
          const self = this as unknown as ExtensionThis
          if (!o) {
            return o
          }
          const field = self.fields[name]
          if (!field) {
            return o
          }
          switch (field.typeName) {
            case 'Int':
              return Number(o)
            case 'String':
              return String(o)
            default:
              return o
          }
        },
        async create<T extends Prisma.ModelName>(o: any) {
          const self = this as unknown as ExtensionThis
          o.data = self.clean(o.data)
          return await (client[self.name] as any).create(o) as ReturnType<PrismaDelegate<T>['create']>
        },
        async $create<T extends Prisma.ModelName>(o: any, options = {}) {
          const self = this as unknown as ExtensionThis
          o = self.clean(o)
          return await (client[self.name] as any).create({ data: o, ...options }) as ReturnType<PrismaDelegate<T>['create']>
        },
        async createMany<T extends Prisma.ModelName>(o: any) {
          const self = this as unknown as ExtensionThis
          o.data = o.data.map((record: any) => self.clean(record))
          return await (client[self.name] as any).createMany(o) as ReturnType<PrismaDelegate<T>['createMany']>
        },
        async $createMany<T extends Prisma.ModelName>(o: any, options = {}) {
          const self = this as unknown as ExtensionThis
          o = o.map((record: any) => self.clean(record))
          return await (client[self.name] as any).createMany({ data: o, ...options }) as ReturnType<PrismaDelegate<T>['createMany']>
        },
        async update<T extends Prisma.ModelName>(o: any) {
          const self = this as unknown as ExtensionThis
          o.data = self.clean(o.data)
          return await (client[self.name] as any).update(o) as ReturnType<PrismaDelegate<T>['update']>
        },
        async $updateById<T extends Prisma.ModelName>(o: any, idName = 'id', options = {}) {
          const self = this as unknown as ExtensionThis
          const id = self.cleanId(o[idName], idName)
          if (id === undefined || id === null || id === '') {
            throw new Error('id不能为空')
          }
          o.data = self.clean(o.data)
          return await (client[self.name] as any).update({
            where: { [idName]: id },
            data: o.data,
            ...options,
          }) as ReturnType<PrismaDelegate<T>['update']>
        },
        async updateMany<T extends Prisma.ModelName>(o: any) {
          const self = this as unknown as ExtensionThis
          o.data = o.data.map((record: any) => self.clean(record))
          return await (client[self.name] as any).updateMany(o) as ReturnType<PrismaDelegate<T>['updateMany']>
        },
        async $updateMany<T extends Prisma.ModelName>(
          o: any,
          options: Omit<Prisma.Args<T, 'updateMany'>, 'where'> = {} as any,
        ) {
          const self = this as unknown as ExtensionThis
          o.data = o.data.map((record: any) => self.clean(record))
          return await (client[self.name] as any).updateMany({ o, ...options }) as ReturnType<PrismaDelegate<T>['updateMany']>
        },
        async upsert<T extends Prisma.ModelName>(o: any) {
          const self = this as unknown as ExtensionThis
          o.create = self.clean(o.create)
          o.update = self.clean(o.update)
          return await (client[self.name] as any).upsert(o) as ReturnType<PrismaDelegate<T>['upsert']>
        },
        async $upsert<T extends Prisma.ModelName>(o: any) {
          const self = this as unknown as ExtensionThis
          o.create = self.clean(o.data)
          o.update = o.create
          delete o.data
          return await (client[self.name] as any).upsert(o) as ReturnType<PrismaDelegate<T>['upsert']>
        },
        async $upsertById<T extends Prisma.ModelName>(o: any, idName = 'id', options = {}) {
          const self = this as unknown as ExtensionThis
          const id = self.cleanId(o[idName], idName)
          if (id === undefined || id === null || id === '') {
            return await self.$create(o, options) as ReturnType<PrismaDelegate<T>['create']>
          }
          return await (client[self.name] as any).upsert({
            where: { [idName]: id },
            create: o,
            update: o,
            ...options,
          }) as ReturnType<PrismaDelegate<T>['upsert']>
        },
        async $list<T extends Prisma.ModelName>(
          where?: Prisma.Args<T, 'findMany'>['where'],
          orderBy?: Prisma.Args<T, 'findMany'>['orderBy'],
          options: Omit<Prisma.Args<T, 'findMany'>, 'where' | 'orderBy'> = {} as any,
        ) {
          const self = this as unknown as ExtensionThis
          return await self.findMany({ where: self.clean1(where), orderBy, ...options }) as ReturnType<PrismaDelegate<T>['findMany']>
        },
        async $page<T extends Prisma.ModelName>(o: PageParams<T>) {
          const self = this as unknown as ExtensionThis
          const size = Number(o.size || 20)
          const page = Number(o.page || 1)
          o.where = self.clean1(o.where)
          delete o.size
          delete o.page

          const r = await self
            .paginate(o)
            .withPages({ limit: size, page, includePageCount: true })

          return {
            data: r[0],
            total: r[1].totalCount,
            page: r[1].currentPage,
            size,
          } as PageResult<T>
        },
        async $getById<T extends Prisma.ModelName>(
          id: number | string,
          idName: string = 'id',
          options: Omit<Prisma.Args<T, 'findFirst'>, 'where' | 'orderBy'> = {} as any,
        ) {
          const self = this as unknown as ExtensionThis
          if (!idName) {
            if (self.idField) {
              idName = self.idField
            }
          }
          id = self.cleanId(id, idName)
          if (id === undefined || id === null || id === '') {
            return null
          }
          return await self.findFirst({ where: { [idName]: id }, ...options }) as ReturnType<PrismaDelegate<T>['findFirst']>
        },
        async $deleteById<T extends Prisma.ModelName>(
          id: number | string | (string | number)[],
          idName: string = 'id',
          options: Omit<Prisma.Args<T, 'delete'>, 'where'> | Omit<Prisma.Args<T, 'deleteMany'>, 'where'> = {} as any,
        ) {
          const self = this as unknown as ExtensionThis
          if (!idName) {
            if (self.idField) {
              idName = self.idField
            }
          }
          try {
            if (Array.isArray(id)) {
              if (id.length === 0) {
                return false
              }
              return await self.deleteMany({ where: { [idName]: { in: id.map((i) => self.cleanId(i, idName)) } }, ...options }) as ReturnType<PrismaDelegate<T>['deleteMany']>
            }
            if (id === undefined || id === null || id === '') {
              return false
            }
            return await self.delete({ where: { [idName]: self.cleanId(id, idName) }, ...options }) as ReturnType<PrismaDelegate<T>['delete']>
          }
          catch (e: any) {
            if (e.code === 'P2025') {
              return false
            }
            throw e
          }
        },
      },
    },
  })
})

const customPrisma = prisma
  .$extends(pagination())
  .$extends(extension)
// @ts-expect-error $RAW not exist
customPrisma.$RAW = prisma

export type {
  Envs,
  EnvsGroup,
  EnvsGroupResult,
  EnvsGroupSimpleResult,
  Message,
  PageResult,
  TaskCore,
  Tasks,
  TasksResult,
}

export interface WhereInput {
  envs: Prisma.envsWhereInput
  envs_group: Prisma.envs_groupWhereInput
  message: Prisma.messageWhereInput
  task_core: Prisma.task_coreWhereInput
  tasks: Prisma.tasksWhereInput
}

export default customPrisma

export const tasks = customPrisma.tasks as unknown as TasksModel
export const envs = customPrisma.envs as unknown as EnvsModel
export const envs_group = customPrisma.envs_group as unknown as EnvsGroupModel
export const task_core = customPrisma.task_core as unknown as TaskCoreModel
export const message = customPrisma.message as unknown as MessageModel
