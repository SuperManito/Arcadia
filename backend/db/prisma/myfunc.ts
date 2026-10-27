import { Prisma } from './generated/prisma/client'

export interface PageResult<T> { data: T, total?: number, page: number, size: number }

type PageArgs<T> = Prisma.Args<T, 'findMany'> & { page?: number | string, size?: number | string, searchCount?: boolean }

// https://github.com/prisma/prisma/blob/v7/packages/client/src/runtime/core/types/exported/Result.ts#L96
export interface BatchPayload { count: number } // GetBatchResult

export function clean(model: any, o: any): any {
  if (!o)
    return o

  // 获取当前模型的字段信息
  const validFields = model.fields
    ? Object.keys(model.fields)
    : []
  const specialFields = ['AND', 'OR', 'NOT']

  return Object.keys(o as any)
    .filter(key => specialFields.includes(key) || validFields.includes(key))
    .reduce((obj: any, key) => {
      obj[key] = (o as any)[key]
      return obj
    }, {})
}

export function cleanArgs(data: any, keys: string[]) {
  if (!data || typeof data !== 'object')
    return {}
  const res: any = {}
  const src = data as any
  for (const k of Object.keys(src)) {
    if (!keys.includes(k)) {
      res[k] = src[k]
    }
  }
  return res
}

export function cleanId(model: any, value: any, fieldName: string): string | number | undefined {
  if (value === undefined || value === null)
    return value
  const field = model.fields?.[fieldName]
  if (!field)
    return value
  switch (field.typeName) {
    case 'Int': {
      const num = Number(value)
      return Number.isNaN(num)
        ? undefined
        : num
    }
    case 'String':
      return String(value)
    default:
      return value
  }
}

export function withMyFunc() {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      model: {
        $allModels: {

          async $create<T, D extends Prisma.Args<T, 'create'>['data'] | Prisma.Args<T, 'create'>['data'][], O extends Omit<Prisma.Args<T, 'create'>, 'data'> | NonNullable<unknown> = NonNullable<unknown>>(
            this: T,
            data: D,
            args?: O,
          ): Promise<D extends readonly any[] ? Prisma.Result<T, { data: D } & O, 'create'> | BatchPayload : Prisma.Result<T, { data: D } & O, 'create'>> {
            const context = Prisma.getExtensionContext(this)
            if (typeof data !== 'string' && Array.isArray(data)) {
              if (data.length > 1) {
                return await (context as any).createMany(args
                  ? { data, ...args }
                  : { data })
              }
              data = data[0]
            }
            return await (context as any).create(args
              ? { data, ...args }
              : { data })
          },

          async $updateById<T, O extends Omit<Prisma.Args<T, 'update'>, 'where' | 'data'> | NonNullable<unknown> = NonNullable<unknown>>(
            this: T,
            input: { id: number | string, data: Prisma.Args<T, 'update'>['data'] },
            idName: string = 'id',
            args?: O,
          ): Promise<Prisma.Result<T, O, 'update'>> {
            const context = Prisma.getExtensionContext(this)
            const { id, data } = input

            const cleanedId = cleanId(context, id, idName)

            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              throw new Error(`${idName} 不能为空`)
            }

            const cleanedData = clean(context, data)

            return await (context as any).update({
              where: { [idName]: cleanedId },
              data: cleanedData,
              ...args,
            })
          },

          async $upsertById<T, O extends Omit<Prisma.Args<T, 'upsert'>, 'where' | 'create' | 'update'> | NonNullable<unknown> = NonNullable<unknown>>(
            this: T,
            data: Prisma.Args<T, 'upsert'>['create'],
            idName: string = 'id',
            args?: O,
          ): Promise<Prisma.Result<T, O, 'upsert'>> {
            const context = Prisma.getExtensionContext(this)
            const idValue = (data as any)[idName]
            const cleanedId = cleanId(context, idValue, idName)

            const cleanedData = clean(context, data)
            // 没有id时一定为新增
            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              return await (context as any).create({
                data: cleanedData,
                ...cleanArgs(args, ['where', 'create', 'update']),
              })
            }
            // 存在id使用默认的upsert逻辑
            return await (context as any).upsert({
              where: { [idName]: cleanedId },
              create: cleanedData,
              update: cleanedData,
              ...cleanArgs(args, ['where', 'create', 'update']),
            })
          },

          async $list<T, A = Prisma.Args<T, 'findMany'>>(
            this: T,
            query?: Omit<Prisma.Args<T, 'findMany'>, 'select' | 'include' | 'omit'>,
            args?: Prisma.Exact<A, Prisma.Args<T, 'findMany'>>,
          ): Promise<Prisma.Result<T, A, 'findMany'>> {
            const context = Prisma.getExtensionContext(this)
            return await (context as any).findMany({
              ...cleanArgs(args, ['where', 'orderBy']),
              ...query,
              where: clean(context, query?.where),
            })
          },

          async $getById<T, O extends Prisma.Args<T, 'findUnique'> | NonNullable<unknown> = NonNullable<unknown>>(
            this: T,
            id: number | string,
            idName: string = 'id',
            args?: O,
          ): Promise<Prisma.Result<T, O, 'findUnique'> | null> {
            const context = Prisma.getExtensionContext(this)
            const cleanedId = cleanId(context, id, idName)

            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              return null
            }

            return await (context as any).findUnique({
              where: { [idName]: cleanedId },
              ...(cleanArgs(args, ['where'])),
            })
          },

          async $deleteById<T, I extends number | string | (number | string)[] = number | string, O extends Omit<Prisma.Args<T, 'delete'>, 'where'> | NonNullable<unknown> = NonNullable<unknown>>(
            this: T,
            id: I,
            idName: string = 'id',
            args?: O,
          ): Promise<I extends readonly any[] ? BatchPayload : Prisma.Result<T, O, 'delete'>> {
            const context = Prisma.getExtensionContext(this)
            if (typeof id !== 'string' && Array.isArray(id)) {
              if (id.length === 0) {
                throw new Error(`${idName} 数组不能为空`)
              }

              return await (context as any).deleteMany({
                where: {
                  [idName]: {
                    in: id.map(item => cleanId(context, item, idName)),
                  },
                },
                ...args,
              })
            }

            const cleanedId = cleanId(context, id, idName)

            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              throw new Error(`${idName} 不能为空`)
            }

            return await (context as any).delete({
              where: { [idName]: cleanedId },
              ...args,
            })
          },

          async $page<T, A>(
            this: T,
            args: Prisma.Exact<A, PageArgs<T>>,
          ): Promise<PageResult<Prisma.Result<T, A, 'findMany'>>> {
            const context = Prisma.getExtensionContext(this)
            const pageArgs = args as PageArgs<T>
            const size = Number(pageArgs.size || 20)
            const page = Number(pageArgs.page || 1)
            if (!Number.isSafeInteger(size) || size < 1) {
              throw new Error('size 必须大于0且为整数')
            }
            if (!Number.isSafeInteger(page) || page < 1) {
              throw new Error('page 必须大于0且为整数')
            }
            // 清理查询条件
            const cleanedWhere = clean(context, pageArgs.where)
            // 剔除无关参数
            const { page: _page, size: _size, searchCount, ...restArgs } = cleanArgs(pageArgs, ['where'])
            // 获取数据和总数
            const p = [
              (context as any).findMany({
                ...restArgs,
                where: cleanedWhere,
                skip: (page - 1) * size,
                take: size,
              }),
            ]
            if (pageArgs.searchCount !== false) {
              p.push((context as any).count({ where: cleanedWhere }))
            }
            const res = await Promise.all(p)
            return {
              data: res[0],
              total: res.length > 1
                ? res[1]
                : -1,
              page,
              size,
            }
          },
        },
      },
    })
  })
}
