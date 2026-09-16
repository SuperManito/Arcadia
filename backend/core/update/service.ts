import { SocketEvent } from '../type/socket'
import { getRuntimeModuleConfigReadonly, updateRuntimeConfigValue, updateRuntimeConfigValues } from '../config'
import { socketCommon } from '../../server/socketCommon'
import { ConfigKeyRuntime } from '../type/config'
import { isUpgradeRunning } from './execute'
import type { UpdateSnapshot } from './types'
import { updateCore } from './updateCore'

/**
 * 获取版本更新状态快照
 *
 * @description 只读本地缓存与 git，不发起网络请求
 */
export async function getUpdateSnapshot(): Promise<UpdateSnapshot> {
  let runtime = await getRuntimeModuleConfigReadonly()
  const pendingCommit = runtime[ConfigKeyRuntime.UPDATE_PENDING_COMMIT]

  if (pendingCommit) {
    const localHead = await updateCore.getCommit('HEAD')
    // 本地 HEAD 已追上待处理目标时按钩子路径刷新状态
    if (localHead && await updateCore.isCommitIncluded(pendingCommit, localHead)) {
      await refreshVersionStateAfterUpgrade()
      runtime = await getRuntimeModuleConfigReadonly()
    }
  }

  const local = await updateCore.getLocalVersionInfo()
  // 从未计算过时现算一次（纯本地）
  const versionTag = runtime[ConfigKeyRuntime.UPDATE_CURRENT_TAG] || await resolveCurrentVersionTag()
  const lastAtRaw = runtime[ConfigKeyRuntime.UPDATE_CHECK_LAST_AT]

  return {
    current: { versionTag, ...local },
    lastCheckedAt: lastAtRaw ? Number(lastAtRaw) : null,
    updating: await isUpgradeRunning(),
  }
}

/**
 * 现算当前版本号并写缓存
 */
async function resolveCurrentVersionTag(): Promise<string | null> {
  return updateCore.refreshVersionTagCache()
}

/**
 * 更新钩子：CLI 手动更新成功后重新走一遍版本状态逻辑
 *
 * @description 刷新版本缓存与待处理状态并广播前端
 */
export async function refreshVersionStateAfterUpgrade(): Promise<void> {
  const runtime = await getRuntimeModuleConfigReadonly()
  const pendingCommit = runtime[ConfigKeyRuntime.UPDATE_PENDING_COMMIT]
  const localHead = await updateCore.getCommit('HEAD')
  if (pendingCommit && localHead && await updateCore.isCommitIncluded(pendingCommit, localHead)) {
    await updateRuntimeConfigValues([
      { key: ConfigKeyRuntime.UPDATE_PENDING_COMMIT, value: '' },
      { key: ConfigKeyRuntime.UPDATE_PENDING_TAG, value: '' },
      { key: ConfigKeyRuntime.UPDATE_NOTIFIED, value: '' },
    ])
  }

  await resolveCurrentVersionTag()
  if (localHead)
    await updateRuntimeConfigValue(ConfigKeyRuntime.UPDATE_CURRENT_COMMIT, localHead)
  socketCommon.emit(SocketEvent.UPDATE_REFRESH, {})
}
