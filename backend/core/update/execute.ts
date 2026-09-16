import { SocketEvent } from '../type/socket'
import type { Buffer } from 'node:buffer'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { getConfigValue, updateRuntimeConfigValue, updateRuntimeConfigValues } from '../config'
import { socketCommon } from '../../server/socketCommon'
import { APP_DIR_PATH, APP_FILE_PATH } from '../type'
import { ConfigKeyRuntime, ConfigModule } from '../type/config'
import { logger } from '../../utils/logger'
import { updateConstants } from './constants'
import { updateCore } from './updateCore'

/**
 * 更新任务标记文件内容
 */
interface UpgradeMarker {
  targetCommit: string
  versionTag: string | null
  branch: string
  startedAt: number
  pid?: number
}

let updating = false

/**
 * 查询是否有更新任务正在执行
 *
 * @description 供快照接口与检测门控使用
 */
export async function isUpgradeRunning(): Promise<boolean> {
  if (updating)
    return true
  if (await getConfigValue(ConfigKeyRuntime.UPDATE_UPGRADE_PENDING, ConfigModule.RUNTIME) !== 'true')
    return false
  const marker = await readMarker()
  if (!marker)
    return false
  if (Date.now() - marker.startedAt >= updateConstants.UPGRADE_SCRIPT_TIMEOUT_MS)
    return false
  return marker.pid ? isProcessAlive(marker.pid) : true
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  }
  catch (e: any) {
    return e?.code === 'EPERM'
  }
}

async function clearUpgradeHook(): Promise<void> {
  await clearMarker()
  await updateRuntimeConfigValue(ConfigKeyRuntime.UPDATE_UPGRADE_PENDING, 'false')
}

async function writeMarker(marker: UpgradeMarker): Promise<void> {
  await mkdir(APP_DIR_PATH.TMP, { recursive: true })
  await writeFile(APP_FILE_PATH.UPDATE_MARKER, JSON.stringify({ ...marker, startedAt: Date.now() }), 'utf8')
}

async function readMarker(): Promise<UpgradeMarker | null> {
  try {
    return JSON.parse(await readFile(APP_FILE_PATH.UPDATE_MARKER, 'utf8')) as UpgradeMarker
  }
  catch {
    return null
  }
}

async function clearMarker(): Promise<void> {
  await rm(APP_FILE_PATH.UPDATE_MARKER, { force: true })
}

async function clearUpgradeLog(): Promise<void> {
  await rm(APP_FILE_PATH.UPDATE_RUN_LOG, { force: true })
}

/**
 * 读取更新脚本运行日志并写入后端日志
 *
 * @description 脚本输出暂存于临时文件，仅在更新失败时读取打印，随后清理
 */
async function dumpUpgradeLog(): Promise<void> {
  try {
    const content = await readFile(APP_FILE_PATH.UPDATE_RUN_LOG, 'utf8')
    if (content.trim())
      logger.error(`[版本更新] 更新脚本输出：\n${content.trimEnd()}`)
  }
  catch {}
  await rm(APP_FILE_PATH.UPDATE_RUN_LOG, { force: true })
}

/**
 * 启动后台更新
 *
 * @description 使用最近一次检测落库的待处理目标，直接转入后台执行
 */
export async function startUpgrade(): Promise<void> {
  if (updating)
    throw new Error('已有更新任务在执行中，请勿重复触发')
  // 先同步置位再 await，避免并发请求同时通过互斥检查
  updating = true

  try {
    // 跨进程互斥：未过期的任务标记拒绝重复触发
    const flag = await getConfigValue(ConfigKeyRuntime.UPDATE_UPGRADE_PENDING, ConfigModule.RUNTIME)
    if (flag === 'true') {
      const existing = await readMarker()
      const stale = !existing || !Number.isFinite(existing.startedAt) || Date.now() - existing.startedAt >= updateConstants.UPGRADE_SCRIPT_TIMEOUT_MS
      if (!stale)
        throw new Error('已有更新任务在执行中，请勿重复触发')
      await clearUpgradeHook()
    }

    const [branch, pendingCommit, pendingTag] = await Promise.all([
      updateCore.getCurrentBranch(),
      getConfigValue(ConfigKeyRuntime.UPDATE_PENDING_COMMIT, ConfigModule.RUNTIME),
      getConfigValue(ConfigKeyRuntime.UPDATE_PENDING_TAG, ConfigModule.RUNTIME),
    ])
    if (!branch || !pendingCommit)
      throw new Error('当前没有可更新的版本，请重新检查更新后再试')

    const marker: UpgradeMarker = { targetCommit: pendingCommit, versionTag: pendingTag || null, branch, startedAt: Date.now() }
    await updateRuntimeConfigValue(ConfigKeyRuntime.UPDATE_UPGRADE_PENDING, 'true')
    runUpgradeProcess(marker)
  }
  catch (e: any) {
    updating = false
    throw e
  }
}

function runUpgradeProcess(marker: UpgradeMarker): void {
  // launcher 以独立会话拉起真实升级脚本后立即退出，使脚本脱离后端进程树，
  // 避免更新流程重启后端服务（pm2 tree-kill）时被连带终止
  const child = updateCore.spawnUpgrade({ ...process.env, ARCADE_UPDATE_SOURCE: 'backend' })

  let realPid: number | null = null
  let stdout = ''
  let finished = false
  let overallTimeout: NodeJS.Timeout | undefined
  let sigkillTimer: NodeJS.Timeout | undefined
  let watchTimer: ReturnType<typeof setInterval> | null = null

  // 先落标记（无 pid），拿到真实脚本 PID 后补充，供重启后的存活探测使用
  writeMarker(marker).catch(() => {})
  socketCommon.emit(SocketEvent.UPDATE_REFRESH, {})

  const cleanup = () => {
    finished = true
    if (overallTimeout)
      clearTimeout(overallTimeout)
    if (sigkillTimer)
      clearTimeout(sigkillTimer)
    if (watchTimer)
      clearInterval(watchTimer)
  }

  // 解析 launcher 输出的真实脚本 PID
  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf8')
    const pid = Number(stdout.trim())
    if (Number.isInteger(pid) && pid > 0) {
      realPid = pid
      writeMarker({ ...marker, pid }).catch(() => {})
    }
  })

  overallTimeout = setTimeout(() => {
    if (finished)
      return
    logger.error('[版本更新] 更新超时')
    const targetPid = realPid ?? child.pid
    if (targetPid) {
      try {
        process.kill(-targetPid, 'SIGTERM')
      }
      catch {}
      sigkillTimer = setTimeout(() => {
        if (!finished && targetPid) {
          try {
            process.kill(-targetPid, 'SIGKILL')
          }
          catch {}
        }
      }, updateConstants.UPGRADE_SIGKILL_GRACE_MS)
    }
  }, updateConstants.UPGRADE_SCRIPT_TIMEOUT_MS)

  child.stderr.on('data', (data: Buffer) => logger.error(`[版本更新] ${data.toString('utf-8').trimEnd()}`))

  child.on('close', async () => {
    if (finished)
      return
    if (!realPid) {
      // 未获取到真实脚本 PID，视为启动失败
      cleanup()
      updating = false
      logger.error('[版本更新] 更新脚本启动失败')
      await dumpUpgradeLog()
      await clearUpgradeHook()
      socketCommon.emit(SocketEvent.UPDATE_REFRESH, {})
      return
    }
    // launcher 已退出，改为轮询真实脚本存活状态
    const pid = realPid
    watchTimer = setInterval(async () => {
      if (finished)
        return
      if (!isProcessAlive(pid)) {
        cleanup()
        updating = false
        await finalizeUpgradeOutcome(marker)
      }
    }, 2000)
  })

  child.on('error', async (err) => {
    cleanup()
    updating = false
    logger.error('[版本更新] 启动更新脚本失败', err.message || err)
    await dumpUpgradeLog()
    await clearUpgradeHook()
    socketCommon.emit(SocketEvent.UPDATE_REFRESH, {})
  })
}

/**
 * 判断更新目标是否已到达
 *
 * @description 以本地 HEAD 是否等于远程分支 tip 为准；无分支信息时退回目标 commit 比对
 */
async function isTargetReached(marker: UpgradeMarker): Promise<boolean> {
  const newHead = await updateCore.getCommit('HEAD')
  if (!newHead)
    return false
  if (marker.branch) {
    const remoteHead = await updateCore.getCommit(`origin/${marker.branch}`)
    return !!remoteHead && newHead === remoteHead
  }
  return newHead.startsWith(marker.targetCommit)
}

/**
 * 更新收尾
 *
 * @description 以本地 HEAD 是否到达远程分支 tip 为准，不依赖脚本退出码
 */
async function finalizeUpgradeOutcome(marker: UpgradeMarker): Promise<{ success: boolean }> {
  const success = await isTargetReached(marker)
  const newHead = await updateCore.getCommit('HEAD')

  if (success) {
    await updateRuntimeConfigValues([
      { key: ConfigKeyRuntime.UPDATE_PENDING_COMMIT, value: '' },
      { key: ConfigKeyRuntime.UPDATE_CHECK_LAST_AT, value: String(Date.now()) },
    ])
    // 更新后重新从本地获取当前版本号
    await updateCore.refreshVersionTagCache()
    const entries: Array<{ key: ConfigKeyRuntime, value: string }> = [
      { key: ConfigKeyRuntime.UPDATE_PENDING_TAG, value: '' },
      { key: ConfigKeyRuntime.UPDATE_NOTIFIED, value: '' },
    ]
    if (newHead)
      entries.push({ key: ConfigKeyRuntime.UPDATE_CURRENT_COMMIT, value: newHead })
    await updateRuntimeConfigValues(entries)
    await clearUpgradeLog()
  }
  else {
    await dumpUpgradeLog()
  }

  await clearUpgradeHook()
  socketCommon.emit(SocketEvent.UPDATE_REFRESH, {})
  return { success }
}

/**
 * 后端启动时恢复未完成的更新状态
 *
 * @description 清理残留标记，或补齐进程重启丢失的收尾
 */
export async function restoreUpgradeState(): Promise<void> {
  const flag = await getConfigValue(ConfigKeyRuntime.UPDATE_UPGRADE_PENDING, ConfigModule.RUNTIME)
  if (flag !== 'true')
    return
  const marker = await readMarker()
  const stale = !marker || !Number.isFinite(marker.startedAt) || Date.now() - marker.startedAt >= updateConstants.UPGRADE_SCRIPT_TIMEOUT_MS
  if (stale) {
    await clearUpgradeHook()
    await clearUpgradeLog()
    return
  }
  if (await isTargetReached(marker)) {
    await finalizeUpgradeOutcome(marker)
    return
  }
  // 进程已退出且未到达目标：清理残留并通知失败；否则等待脚本结束或超时
  if (marker.pid && !isProcessAlive(marker.pid)) {
    await clearUpgradeHook()
    await dumpUpgradeLog()
    socketCommon.emit(SocketEvent.UPDATE_REFRESH, {})
  }
}
