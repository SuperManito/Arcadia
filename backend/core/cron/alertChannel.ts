export function parseTaskAlertChannelIds(value: string | null | undefined): number[] {
  if (!value) {
    return []
  }
  return [
    ...new Set(
      value
        .split(',')
        .map(item => item.trim())
        .filter(item => /^\d+$/.test(item))
        .map(item => Number.parseInt(item, 10))
        .filter(id => Number.isSafeInteger(id) && id > 0),
    ),
  ]
}

export function normalizeTaskAlertChannelIds(value: unknown): string {
  if (Array.isArray(value)) {
    return parseTaskAlertChannelIds(value.join(',')).join(',')
  }
  if (typeof value === 'string') {
    return parseTaskAlertChannelIds(value).join(',')
  }
  return ''
}
