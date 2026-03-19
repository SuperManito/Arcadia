import type { envsGroupModel, envsModel } from '../../db'
import db from '../../db'
import { generateEnvSh } from '../../utils/envUtil'

export enum EnvTypes {
  ORDINARY = 'ordinary',
  COMPOSITE = 'composite',
  COMPOSITE_VALUE = 'composite_value',
}
export type TypeCategory = EnvTypes
export interface EnvTag {
  label: string
}
export function isComposite(
  data: envsModel | envsGroupModel,
  i?: boolean,
): data is envsGroupModel {
  if (typeof i === 'boolean') {
    return i
  }
  return !('group_id' in data)
}

/**
 * 生成用于 CLI 的批量声明脚本
 */
export async function convertToCLIExport() {
  const envsGroupResult = await db.envsGroup.$list(
    {
      id: { not: 0 },
    },
    {
      sort: 'asc', // 升序
    },
    {
      include: {
        envs: true,
      },
    },
  )
  const envsResult = await db.envs.$list({
    group_id: 0,
  })
  return generateEnvSh(envsGroupResult, envsResult)
}

/**
 * 固定排序
 */
export async function fixOrder() {
  await db.$executeRaw`
      UPDATE envsGroup
      SET sort = t.row_num
      FROM (SELECT rowid, id, row_number() over ( order by sort) as row_num
            FROM envsGroup
            WHERE id != 0) t
      WHERE t.id = envsGroup.id`
}

export async function fixItemOrder() {
  await db.$executeRaw`
      UPDATE envs
      SET sort = t.row_num
      FROM (SELECT id, row_number() over (PARTITION BY group_id order by sort) as row_num
            FROM envs) t
      WHERE t.id = envs.id`
}

/**
 * 更新排序
 */
export async function getCurrentMaxSortValue(isEnvsGroup: boolean) {
  const result = isEnvsGroup
    ? await db.envsGroup.$page(
        {
          where: { id: { not: 0 } },
          orderBy: [{ sort: 'desc' }],
          page: 1,
          size: 1,
        },
      )
    : await db.envs.$page(
        {
          orderBy: [{ sort: 'desc' }],
          page: 1,
          size: 1,
        },
      )
  const sort = result.data[0]?.sort
  if (!sort && sort !== 0) {
    throw new Error('未找到最大排序值')
  }
  return sort
}
export async function updateSortById(id: number, newOrder: number) {
  const oldRecord = await db.envsGroup.$getById(id) as envsGroupModel
  if (newOrder === oldRecord.sort) {
    return true
  }
  const args = newOrder > oldRecord.sort
    ? [oldRecord.sort, newOrder, -1, oldRecord.sort + 1, newOrder]
    : [oldRecord.sort, newOrder, 1, newOrder, oldRecord.sort - 1]

  await db.$executeRaw`BEGIN TRANSACTION;`
  if (newOrder > oldRecord.sort) {
    await db.$executeRaw`UPDATE envsGroup
                         SET sort = sort + ${args[2]}
                         WHERE sort > ${oldRecord.sort}
                           AND sort <= ${newOrder}
                           AND id != 0`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE envsGroup
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder}
                           AND sort < ${oldRecord.sort}
                           AND id != 0`
  }
  await db.$executeRaw`UPDATE envsGroup
                       SET sort = ${newOrder}
                       WHERE id = ${id}`
  await db.$executeRaw`COMMIT;`

  return true
}
export async function updateItemSortById(id: number, newOrder: number) {
  const oldRecord = await db.envs.$getById(id) as envsModel
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
                         WHERE sort > ${oldRecord.sort}
                           AND sort <= ${newOrder}
                           AND group_id = ${args[5]}`
  }
  if (newOrder < oldRecord.sort) {
    await db.$executeRaw`UPDATE envs
                         SET sort = sort + ${args[2]}
                         WHERE sort >= ${newOrder}
                           AND sort < ${oldRecord.sort}
                           AND group_id = ${args[5]}`
  }
  await db.$executeRaw`UPDATE envs
                       SET sort = ${newOrder}
                       WHERE id = ${id}`
  await db.$executeRaw`COMMIT;`

  return true
}

/**
 * 判定变量名是否已存在
 */
export async function checkVaribleExsit(name: string) {
  if (((await db.envsGroup.$list({
    id: { not: 0 },
    type: name,
  })) || []).length > 0) {
    throw new Error(`已存在复合变量 ${name}`)
  }
  if (((await db.envs.$list({
    type: name,
  })) || []).length > 0) {
    throw new Error(`已存在普通变量 ${name}`)
  }
}

/**
 * 解析 tag_list 字段
 */
export function parseTagList(raw: string): EnvTag[] {
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return []
    return parsed.filter(
      (item): item is EnvTag =>
        item && typeof item === 'object'
        && typeof item.label === 'string',
    )
  }
  catch {
    return []
  }
}

export function tagLabelContainsFilter(
  label: string,
): { tag_list: { contains: string } } {
  return { tag_list: { contains: `"label":"${label}"` } }
}

/**
 * 获取标签列表（去重、排序、搜索）
 */
export async function getTagsList() {
  const rows = await db.envsGroup.findMany({
    where: { id: { not: 0 } },
    select: { tag_list: true },
  })
  return handleTagsListFilter(rows)
}
export async function getTagsListItem(group_id: number) {
  const rows = await db.envs.findMany({
    where: { group_id: { equals: group_id } },
    select: { tag_list: true },
  })
  return handleTagsListFilter(rows)
}
function handleTagsListFilter(rows: ({ tag_list: string })[]) {
  const tagListStrings: string[] = []
  tagListStrings.push(...rows.map(r => r.tag_list))
  // 聚合去重（以 label 为 key）
  const tagMap = new Map<string, EnvTag>()
  for (const str of tagListStrings) {
    const tags = parseTagList(str)
    for (const tag of tags) {
      if (!tagMap.has(tag.label)) {
        tagMap.set(tag.label, tag)
      }
    }
  }
  const tags = Array.from(tagMap.values())
  return tags.sort((a, b) => a.label.localeCompare(b.label))
}
