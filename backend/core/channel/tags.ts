import { collectTagLabels, formatTagColumn, normalizeTagLabels } from '../../utils/tagsUtil'
import db from '../../db'

const CHANNEL_TAGS_MAX_COUNT = 10
const CHANNEL_TAG_MAX_LENGTH = 50

/**
 * 标签清洗：去重去空、限制数量与长度，逗号分隔落库；标签本身不得含逗号
 */
export function cleanChannelTags(raw: unknown): string {
  const labels = normalizeTagLabels(raw, '渠道标签')
  if (labels.length > CHANNEL_TAGS_MAX_COUNT) {
    throw new Error(`渠道标签数量不能超过 ${CHANNEL_TAGS_MAX_COUNT} 个`)
  }
  if (labels.some(label => label.length > CHANNEL_TAG_MAX_LENGTH)) {
    throw new Error(`单个渠道标签长度不能超过 ${CHANNEL_TAG_MAX_LENGTH} 个字符`)
  }
  return formatTagColumn(labels)
}

/**
 * 全量渠道标签候选项
 */
export async function getChannelTags() {
  const rows = await db.notificationChannel.$list(
    {},
    {
      select: { tags: true },
    },
  )
  return collectTagLabels(rows.map(row => row.tags))
}
