import db from '../../db'
import { ChannelType } from './registry'
import { cleanChannelConfig } from './dispatch'

export const CHANNEL_NAME_MAX_LENGTH = 50

export interface ChannelPayloadInput {
  name?: string
  type?: string
  config?: string | Record<string, unknown>
}

export interface CleanedChannelPayload {
  name: string
  type: ChannelType
  config: string
}

export async function validateChannelPayload(
  body: ChannelPayloadInput,
  options?: { excludeId?: number, skipNameCheck?: boolean },
): Promise<CleanedChannelPayload> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!options?.skipNameCheck) {
    if (!name) {
      throw new Error('渠道名称不能为空')
    }
    if (name.length > CHANNEL_NAME_MAX_LENGTH) {
      throw new Error(`渠道名称长度不能超过 ${CHANNEL_NAME_MAX_LENGTH} 个字符`)
    }
    const duplicated = await db.notificationChannel.findFirst({
      where: {
        name,
        ...(options?.excludeId !== undefined ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    })
    if (duplicated) {
      throw new Error('渠道名称已存在')
    }
  }

  const type = body.type as ChannelType
  if (!Object.values(ChannelType).includes(type)) {
    throw new Error(`不支持的渠道类型：${String(type)}`)
  }

  let config: unknown = body.config
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config)
    }
    catch {
      throw new Error('渠道配置无效：JSON 解析失败')
    }
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('渠道配置无效：必须是对象')
  }
  const cleaned = cleanChannelConfig(type, config as Record<string, unknown>)

  return {
    name,
    type,
    config: JSON.stringify(cleaned),
  }
}
