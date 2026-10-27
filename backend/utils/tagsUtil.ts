const TAG_SEPARATOR = ','

/**
 * 标签列统一存为 `,a,b,`：首尾各带一个逗号使 contains 能整段精确匹配，因此标签本身不得含逗号
 */
export function formatTagColumn(labels: string[]): string {
  return labels.length > 0
    ? `${TAG_SEPARATOR}${labels.join(TAG_SEPARATOR)}${TAG_SEPARATOR}`
    : ''
}

export function parseTagColumn(raw: string): string[] {
  if (!raw) {
    return []
  }
  return raw.split(TAG_SEPARATOR).filter(Boolean)
}

/**
 * 归并多条记录的标签列，去重后以字母序返回
 */
export function collectTagLabels(rawValues: string[]): string[] {
  const labels = new Set<string>()
  for (const raw of rawValues) {
    for (const label of parseTagColumn(raw)) {
      labels.add(label)
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b))
}

export function buildTagContainsValue(label: string): string {
  return `${TAG_SEPARATOR}${label}${TAG_SEPARATOR}`
}

/**
 * 写入值归一：接受字符串数组或逗号分隔字符串，去空去重；subject 为报错里的标签归属
 */
export function normalizeTagLabels(raw: unknown, subject: string): string[] {
  let list: unknown = raw
  if (typeof list === 'string') {
    list = list.split(TAG_SEPARATOR)
  }
  if (list === null || list === undefined) {
    list = []
  }
  if (!Array.isArray(list) || !list.every(item => typeof item === 'string')) {
    throw new Error(`${subject}无效：必须是字符串数组或逗号分隔字符串`)
  }
  const labels = [
    ...new Set((list as string[]).map(item => item.trim()).filter(Boolean)),
  ]
  if (labels.some(label => label.includes(TAG_SEPARATOR))) {
    throw new Error(`${subject}不能包含逗号`)
  }
  return labels
}
