import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  envs as Envs,
  envs_group as EnvsGroup,
  message as Message,
  task_core as TaskCore,
  tasks as Tasks,
} from '@prisma/client'

declare global {
  interface BigInt {
    // eslint-disable-next-line ts/method-signature-style
    toJSON(): string
  }
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
type PrismaDelegate<T extends Prisma.ModelName> = PrismaClient[T]

export interface EnvsGroupResult extends EnvsGroup {
  envs: Envs[]
}

export interface EnvsGroupSimpleResult extends EnvsGroup {
  envs: number
}

export interface TasksResult extends Tasks {
  is_running: boolean
  log_path: string
  script_path: string
}

export interface PageResult<T extends Prisma.ModelName> {
  data: UnwrapPromise<ReturnType<PrismaDelegate<T>['findMany']>>
  total: number
  page: number
  size: number
}

export interface PageParams<T extends Prisma.ModelName> {
  select?: Prisma.Args<T, 'findMany'>['select']
  where?: Prisma.Args<T, 'findMany'>['where']
  orderBy?: Prisma.Args<T, 'findMany'>['orderBy']
  include?: Prisma.Args<T, 'findMany'>['include']
  page?: string | number
  size?: string | number
}

export interface PaginateResult<T> {
  withPages: (options: {
    limit: number
    page: number
    includePageCount?: boolean
  }) => Promise<[T[], { totalCount: number, currentPage: number }]>
}

interface ExtendedMethods<T extends Prisma.ModelName, TData> {
  $page: (params: PageParams<T>) => Promise<{
    data: TData[]
    total: number
    page: number
    size: number
  }>

  $getById: (
    id: number | string,
    idName?: string,
    options?: Omit<Prisma.Args<T, 'findFirst'>, 'where' | 'orderBy'>
  ) => Promise<TData | null>

  $list: (
    where?: Prisma.Args<T, 'findMany'>['where'],
    orderBy?: Prisma.Args<T, 'findMany'>['orderBy'],
    options?: Omit<Prisma.Args<T, 'findMany'>, 'where' | 'orderBy'>
  ) => Promise<TData[]>

  $create: (
    data: any,
    options?: Omit<Prisma.Args<T, 'create'>, 'data'>
  ) => Promise<TData>

  $createMany: (
    data: any[],
    options?: Omit<Prisma.Args<T, 'createMany'>, 'data'>
  ) => Promise<Prisma.BatchPayload>

  $updateById: (
    data: any,
    idName?: string,
    options?: any
  ) => Promise<TData>

  $updateMany: (
    data: any,
    options?: Omit<Prisma.Args<T, 'updateMany'>, 'where'>
  ) => Promise<Prisma.BatchPayload>

  $upsert: (
    data: any
  ) => Promise<TData>

  $upsertById: (
    data: any,
    idName?: string,
    options?: any
  ) => Promise<TData>

  $deleteById: (
    id: number | string | (string | number)[],
    idName?: string,
    options?: Omit<Prisma.Args<T, 'delete'>, 'where'> | Omit<Prisma.Args<T, 'deleteMany'>, 'where'>
  ) => Promise<boolean | TData>

  // 工具方法
  clean: (o: any) => any
  clean1: (o: any) => any
  cleanId: (o: any, name: string) => any
}

export type TasksModel = PrismaClient['tasks'] & ExtendedMethods<'tasks', Tasks>
export type EnvsModel = PrismaClient['envs'] & ExtendedMethods<'envs', Envs>
export type EnvsGroupModel = PrismaClient['envs_group'] & ExtendedMethods<'envs_group', EnvsGroup>
export type TaskCoreModel = PrismaClient['task_core'] & ExtendedMethods<'task_core', TaskCore>
export type MessageModel = PrismaClient['message'] & ExtendedMethods<'message', Message>
