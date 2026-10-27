import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { APP_DIR_PATH } from '../type'
import { ConfigKeySystem, ConfigModule } from '../type/config'
import { reapplyAllTimezone, setCronTimezone } from '../cron/engine'
import db from '../../db'
import { updateSystemConfigValues } from './update'

const DEP_SH_PATH = path.join(APP_DIR_PATH.SHELL, 'utils/dep.sh')

// IANA 时区格式：仅允许字母、数字、下划线、+、- 及单个 / 分隔，不含 ..
const TIMEZONE_RE = /^[A-Z][\w+\-]*(\/[A-Z][\w+\-]*)*$/i
const ZONEINFO_ROOT = '/usr/share/zoneinfo'

/**
 * 调用 dep.sh get-source <ecosystem>，返回当前系统配置的软件源 URL
 * @param ecosystem npm | pip | apt
 */
function depGetSource(ecosystem: 'npm' | 'pip' | 'apt' | 'gem'): string {
  try {
    return execFileSync('bash', [DEP_SH_PATH, 'get-source', ecosystem], {
      encoding: 'utf8',
      timeout: 10000,
    }).trim()
  }
  catch {
    return ''
  }
}

/**
 * 调用 dep.sh set-source <ecosystem> <url>，将 DB 中存储的源配置应用到对应工具
 * @param ecosystem npm | pip | apt
 * @param url DB 中存储的镜像源 URL，传空字符串表示重置为默认
 */
export function depSetSource(ecosystem: 'npm' | 'pnpm' | 'pip' | 'apt' | 'gem', url: string): void {
  try {
    execFileSync('bash', [
      DEP_SH_PATH,
      'set-source',
      ecosystem,
      url,
    ], {
      encoding: 'utf8',
      timeout: 30000,
    })
  }
  catch {
    // 工具不存在或权限不足，静默忽略
  }
}

/**
 * 检测并补充空缺的软件源配置
 * 若对应配置键在 DB 中为空，则调用 dep.sh get-source 检测当前系统源并写入 DB
 */
export async function detectAndSaveSourcesIfEmpty(): Promise<void> {
  const configs = await db.config.$list({
    where: { module: ConfigModule.SYSTEM },
  })
  const configMap: Record<string, string> = {}
  for (const item of configs) {
    configMap[item.key] = item.value
  }

  const detections: Array<{ key: ConfigKeySystem, ecosystem: 'npm' | 'pip' | 'apt' | 'gem' }> = [
    { key: ConfigKeySystem.NPM_REGISTRY, ecosystem: 'npm' },
    { key: ConfigKeySystem.PIP_INDEX_URL, ecosystem: 'pip' },
    { key: ConfigKeySystem.APT_MIRROR_URL, ecosystem: 'apt' },
    { key: ConfigKeySystem.GEM_REGISTRY, ecosystem: 'gem' },
  ]

  const entries: Array<{ key: ConfigKeySystem, value: string }> = []
  for (const { key, ecosystem } of detections) {
    if (!configMap[key]) {
      const detected = depGetSource(ecosystem)
      if (detected) {
        entries.push({ key, value: detected })
      }
    }
  }
  if (entries.length > 0) {
    await updateSystemConfigValues(entries)
  }
}

/**
 * 应用系统时区配置
 * - 校验 IANA 格式及路径安全后更新 cron 引擎时区
 * - 尝试更新系统 /etc/localtime（需要 root 权限，非 Linux 环境下静默跳过）
 */
export function applySystemTimezone(tz: string): void {
  if (!TIMEZONE_RE.test(tz))
    return

  const zoneFile = path.join(ZONEINFO_ROOT, tz)
  // 防止路径穿越：确保解析后仍在 zoneinfo 目录内
  if (!zoneFile.startsWith(`${ZONEINFO_ROOT}/`))
    return

  setCronTimezone(tz)
  reapplyAllTimezone()
  try {
    if (fs.existsSync(zoneFile)) {
      if (fs.existsSync('/etc/localtime')) {
        fs.unlinkSync('/etc/localtime')
      }
      fs.symlinkSync(zoneFile, '/etc/localtime')
    }
  }
  catch {
    // 权限不足或非 Linux 环境，静默忽略
  }
}
