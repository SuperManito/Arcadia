import { prisma } from './prisma/db'
import type { envsGroupModel } from './prisma/generated/models/envsGroup'
import type { envsModel } from './prisma/generated/models/envs'

export type * from './prisma/db'

export default prisma

export const db = prisma

// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function () {
  return this.toString()
}

// 自定义模型,方便其他地方使用,统一大写开头!

// 组合模型,统一Combo开头
export type ComboEnvsGroupModel = envsGroupModel & { envs: envsModel[] }
