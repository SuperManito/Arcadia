import type { GeneralConfig } from './types'
import { validateObject } from '../../utils'
import db from '../../db'
import { CHANNEL_CONFIG_RULES, ChannelType } from './registry'

export const CHANNEL_NAME_MAX_LENGTH = 50

/**
 * 无论前端是否提交都写入 general，缺省空字符串并 trim
 */
function cleanGeneralConfig(raw: unknown): GeneralConfig {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  return {
    footer: typeof source.footer === 'string' ? source.footer.trim() : '',
    messageTemplate: typeof source.messageTemplate === 'string' ? source.messageTemplate.trim() : '',
    proxy: typeof source.proxy === 'string' ? source.proxy.trim() : '',
  }
}

/**
 * 保存期配置清洗：字段类型校验 + 白名单过滤 + 字符串 / 数组归一
 */
export function cleanChannelConfig(type: ChannelType, raw: Record<string, unknown>): Record<string, unknown> {
  const rules = CHANNEL_CONFIG_RULES[type]
  try {
    validateObject(raw, rules)
  }
  catch (e: any) {
    throw new Error(`渠道配置无效：${e?.message ?? '字段类型错误'}`)
  }
  const result: Record<string, unknown> = {}
  for (const [key, options] of rules) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      continue
    }
    const value = raw[key]
    if (options?.[1]?.[1] === 'string') {
      const text = (value as string).trim()
      if (options[0] && !text) {
        throw new Error(`渠道配置无效：${key} 不能为空`)
      }
      result[key] = text
    }
    else if (Array.isArray(value)) {
      result[key] = [...new Set(value.map(item => (typeof item === 'string' ? item.trim() : item)).filter(item => item !== ''))]
    }
    else {
      result[key] = value
    }
  }
  result.general = cleanGeneralConfig(raw.general)
  return result
}

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

/**
 * 渠道保存载荷校验：本地校验与 config 清洗前置，全部通过后才查库名称查重
 */
export async function validateChannelPayload(
  body: ChannelPayloadInput,
  options?: { excludeId?: number, skipNameCheck?: boolean },
): Promise<CleanedChannelPayload> {
  const checkName = !options?.skipNameCheck
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (checkName) {
    if (!name) {
      throw new Error('渠道名称不能为空')
    }
    if (name.length > CHANNEL_NAME_MAX_LENGTH) {
      throw new Error(`渠道名称长度不能超过 ${CHANNEL_NAME_MAX_LENGTH} 个字符`)
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

  if (checkName) {
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

  return {
    name,
    type,
    config: JSON.stringify(cleaned),
  }
}
