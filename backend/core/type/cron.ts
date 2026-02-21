/**
 * 任务类型
 */
export enum TasksTypeEnum {
  SYSTEM = 'system',
  USER = 'user',
  ALL = 'all',
}
export type TasksType = TasksTypeEnum.SYSTEM | TasksTypeEnum.USER

/**
 * 任务查询过滤类型
 */
export type TasksFilterType = TasksType | TasksTypeEnum.ALL

/**
 * 验证任务类型是否合法
 */
export function isValidTasksType(value: string): value is TasksType {
  return value === TasksTypeEnum.SYSTEM || value === TasksTypeEnum.USER
}
export function isValidTasksFilterType(value: string): value is TasksType {
  return isValidTasksType(value) || value === TasksTypeEnum.ALL
}
