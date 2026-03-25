import type { PageResult } from './prisma/myfunc'
import { prisma } from './prisma/db'
import type { envsGroupModel, envsModel } from './prisma/db'

export type * from './prisma/db'

export default prisma

export const db = prisma

// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function () {
  return this.toString()
}

// 组合模型（需以Combo开头定义）
export type ComboEnvsGroupModel = envsGroupModel & { envs: envsModel[] }
export type ComboEnvsGroupWithCount = envsGroupModel & { envs: number }
export type ComboEnvsGroupWithCountRaw = envsGroupModel & { _count: { envs: number } }

// 将关联计数扁平化处理
type FlattenCountType<T> = T extends { _count: infer C }
  ? { [K in Exclude<keyof T, '_count'>]: T[K] } & (C extends object ? C : object)
  : T
export function flattenIncludeRelationCount<T>(
  data: T,
): T extends readonly any[]
  ? Array<FlattenCountType<T[number]>>
  : FlattenCountType<T> {
  const flattenOne = (obj: any): any => {
    if (!obj || typeof obj !== 'object')
      return obj
    const { _count, ...rest } = obj
    if (!_count || typeof _count !== 'object')
      return obj
    return { ...rest, ..._count }
  }
  return (Array.isArray(data) ? data.map(flattenOne) : flattenOne(data)) as any
}

export function flattenEnvsGroupPageResult(
  result: PageResult<ComboEnvsGroupWithCountRaw[]>,
): PageResult<ComboEnvsGroupWithCount[]> {
  return Object.assign({}, result, { data: flattenIncludeRelationCount(result.data) })
}
