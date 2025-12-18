import { Prisma } from '@prismaGeneratedModel/client'

export interface PageResult<T> { data: T, total?: number, page: number, size: number }

export function clean(model: any, o: any): any {
  if (!o)
    return o

  // 获取当前模型的字段信息
  const validFields = model.fields ? Object.keys(model.fields) : []
  const specialFields = ['AND', 'OR', 'NOT']

  return Object.keys(o as any)
    .filter(key => specialFields.includes(key) || validFields.includes(key))
    .reduce((obj: any, key) => {
      obj[key] = (o as any)[key]
      return obj
    }, {})
}

export function cleanId(model: any, value: any, fieldName: string): string | number {
  if (value === undefined || value === null)
    return value
  const field = model.fields?.[fieldName]
  if (!field)
    return value
  switch (field.typeName) {
    case 'Int':
      return Number(value)
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
          $create<
            T,
            A extends Prisma.Args<T, 'create'> = Prisma.Args<T, 'create'>,
            R = Prisma.Result<T, A, 'create'> | Prisma.Result<T, A, 'createMany'>,
          >(
            this: T,
            data: A['data'] | A['data'][],
            opts?: Omit<A, 'data'>,
          ): Promise<R> {
            if (typeof data !== 'string' && Array.isArray(data)) {
              if (data.length === 1) {
                data = data[0]
              }
              else {
                const args = opts ? { data, ...opts } : { data }
                return (this as any).createMany(args) as Promise<any>
              }
            }
            const args = opts ? { data, ...opts } : { data }
            return (this as any).create(args) as Promise<R>
          },
          $updateById<
            T,
            A extends Prisma.Args<T, 'update'> = Prisma.Args<T, 'update'>,
            R = Prisma.Result<T, A, 'update'>,
          >(
            this: T,
            input: { id: number | string, data: A['data'] },
            idName: string = 'id',
            options: Partial<Omit<A, 'where' | 'data'>> = {},
          ): Promise<R> {
            const { id, data } = input

            const cleanedId = cleanId(this, id, idName)

            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              throw new Error(`${idName} 不能为空`)
            }

            const cleanedData = clean(this, data)

            return (this as any).update({
              where: { [idName]: cleanedId },
              data: cleanedData,
              ...options,
            }) as Promise<R>
          },

          $upsertById<
            T,
            A extends Prisma.Args<T, 'upsert'> = Prisma.Args<T, 'upsert'>,
            R = Prisma.Result<T, A, 'upsert'>,
          >(
            this: T,
            data: A['create'],
            idName: string = 'id',
            options: Partial<Omit<A, 'where' | 'create' | 'update'>> = {},
          ): Promise<R> {
            const idValue = (data as any)[idName]
            const cleanedId = cleanId(this, idValue, idName)

            const cleanedData = clean(this, data)
            // 没有id时一定为新增
            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              return (this as any).create({
                data: cleanedData,
                ...options,
              }) as Promise<R>
            }
            // 存在id使用默认的upsert逻辑
            return (this as any).upsert({
              where: { [idName]: cleanedId },
              create: cleanedData,
              update: cleanedData,
              ...options,
            }) as Promise<R>
          },

          $list<
            T,
            A extends Prisma.Args<T, 'findMany'> = Prisma.Args<T, 'findMany'>,
            R = Prisma.Result<T, A, 'findMany'>,
          >(
            this: T,
            where?: any,
            orderBy?: A['orderBy'],
            options: Omit<A, 'where' | 'orderBy'> = {} as any,
          ): Promise<R> {
            return (this as any).findMany({
              where: clean(this, where),
              orderBy,
              ...options,
            }) as Promise<R>
          },

          $getById<
            T,
            A extends Prisma.Args<T, 'findFirst'> = Prisma.Args<T, 'findFirst'>,
            R = Prisma.Result<T, A, 'findFirst'> | null,
          >(
            this: T,
            id: number | string,
            idName: string = 'id',
            options: Partial<Omit<A, 'where'>> = {} as any,
          ): Promise<R> {
            const cleanedId = cleanId(this, id, idName)

            if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
              return Promise.resolve(null) as Promise<R>
            }

            return (this as any).findFirst({
              where: { [idName]: cleanedId },
              ...options,
            }) as Promise<R>
          },

          $deleteById<
            T,
            DA extends Prisma.Args<T, 'delete'> = Prisma.Args<T, 'delete'>,
            DMA extends Prisma.Args<T, 'deleteMany'> = Prisma.Args<T, 'deleteMany'>,
            DR = Prisma.Result<T, DA, 'delete'>,
            DMR = Prisma.Result<T, DMA, 'deleteMany'>,
          >(
            this: T,
            id: number | string | (number | string)[],
            idName: string = 'id',
            options: Partial<Omit<DA | DMA, 'where'>> = {} as any,
          ): Promise<DR | DMR | boolean> {
            try {
              if (typeof id !== 'string' && Array.isArray(id)) {
                if (id.length === 0) {
                  return Promise.resolve(false) as Promise<any>
                }

                return (this as any).deleteMany({
                  where: {
                    [idName]: {
                      in: id.map(item => cleanId(this, item, idName)),
                    },
                  },
                  ...options,
                })
              }

              const cleanedId = cleanId(this, id, idName)

              if (cleanedId === undefined || cleanedId === null || cleanedId === '') {
                return Promise.resolve(false) as Promise<any>
              }

              return (this as any).delete({
                where: { [idName]: cleanedId },
                ...options,
              })
            }
            catch (e: any) {
              // P2025: Record to delete does not exist
              if (e.code === 'P2025') {
                return Promise.resolve(false) as Promise<any>
              }
              throw e
            }
          },
          async $page<
            T,
            A extends Prisma.Args<T, 'findMany'> = Prisma.Args<T, 'findMany'>,
            D = Prisma.Result<T, A, 'findMany'>,
          >(
            this: T,
            args: A & { page?: number | string, size?: number | string, searchCount?: boolean },
          ): Promise<PageResult<D>> {
            const size = Number(args.size || 20)
            const page = Number(args.page || 1)
            if (!Number.isSafeInteger(size) || size < 1) {
              throw new Error('size 必须大于0且为整数')
            }
            if (!Number.isSafeInteger(page) || page < 1) {
              throw new Error('page 必须大于0且为整数')
            }
            // 清理查询条件
            const cleanedWhere = clean(this, args.where)

            // 获取数据和总数
            const p = [
              (this as any).findMany({
                ...args,
                where: cleanedWhere,
                skip: (page - 1) * size,
                take: size,
              }),
            ]
            if (args.searchCount !== false) {
              p.push((this as any).count({ where: cleanedWhere }))
            }
            const res = await Promise.all(p)
            return {
              data: res[0],
              total: res.length > 1 ? res[1] : 'disable',
              page,
              size,
            }
          },
        },
      },
    })
  })
}
