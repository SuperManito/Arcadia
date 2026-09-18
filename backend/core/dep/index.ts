import path from 'node:path'
import { execFile } from 'node:child_process'
import { SocketEvent } from '../type/socket'
import db from '../../db'
import { APP_DIR_PATH } from '../type'
import { socketCommon } from '../../server/socketCommon'
import { logger } from '../../utils/logger'

export const DepStatus = {
  NOT_INSTALLED: 0,
  INSTALLING: 1,
  INSTALLED: 2,
  FAILED: 3,
  UNINSTALLING: 4,
} as const

const socketEventName = SocketEvent.DEP_OPERATE

export type DepStatusValue = (typeof DepStatus)[keyof typeof DepStatus]

const DEP_SCRIPT = path.join(APP_DIR_PATH.SHELL, 'utils/dep.sh')

export const ECOSYSTEMS = ['npm', 'pnpm', 'pip', 'apt', 'luarocks', 'gem']

// 按生态解析包名基础名（去除版本表达式），用于 uninstall / version 查询
const ECOSYSTEM_BASE_NAME: Record<string, (name: string) => string> = {
  npm: name => name.replace(/@[\^~><=\s].*/u, '').replace(/@[^@]*$/u, name.startsWith('@') ? `@${name.split('@')[1] ?? ''}` : ''),
  pnpm: name => name.replace(/@[\^~><=\s].*/u, '').replace(/@[^@]*$/u, name.startsWith('@') ? `@${name.split('@')[1] ?? ''}` : ''),
  pip: name => name.replace(/[><=!;[\s].*/u, ''),
  apt: name => name.replace(/[=><!].*/u, '').trim(),
  gem: name => name.replace(/:.*$/u, '').replace(/[><=!].*/u, '').trim(),
  luarocks: name => name.replace(/[>=<! ].*/u, '').trim(),
}

// 受保护包，不允许添加、安装或卸载
export const PROTECTED: Record<string, Set<string>> = {
  npm: new Set(['pm2', 'table-printer-cli']),
  pnpm: new Set(['pm2', 'table-printer-cli']),
  pip: new Set(['yq']),
  apt: new Set([
    'bash',
    'coreutils',
    'moreutils',
    'diffutils',
    'git',
    'wget',
    'curl',
    'nano',
    'vim',
    'gcc',
    'make',
    'build-essential',
    'procps',
    'ncurses-bin',
    'tzdata',
    'perl',
    'jq',
    'openssh-client',
    'python3',
    'python3-pip',
    'ca-certificates',
    'gnupg',
    'unzip',
    'nodejs',
    'npm',
  ]),
  luarocks: new Set(),
  gem: new Set(),
}

export function getBaseName(ecosystem: string, name: string): string {
  const fn = ECOSYSTEM_BASE_NAME[ecosystem]
  if (!fn)
    return name
  // npm / pnpm 作用域包（@scope/pkg）特殊处理
  if ((ecosystem === 'npm' || ecosystem === 'pnpm') && name.startsWith('@')) {
    const withoutAt = name.slice(1)
    const slashIdx = withoutAt.indexOf('/')
    if (slashIdx !== -1) {
      const rest = withoutAt.slice(slashIdx + 1) // pkg@version
      const base = rest.replace(/@.*$/u, '')
      return `@${withoutAt.slice(0, slashIdx)}/${base}`
    }
  }
  return fn(name)
}

/**
 * 平台保留依赖直接抛错，文案按动作区分
 */
export function assertNotProtected(ecosystem: string, name: string, action: '添加' | '操作' = '操作') {
  const baseName = getBaseName(ecosystem, name)
  if (PROTECTED[ecosystem]?.has(baseName))
    throw new Error(`${baseName} 为平台保留依赖，禁止${action}！`)
}

type QueueTask = () => Promise<void>

class SerialQueue {
  private queue: QueueTask[] = []
  private running = false

  add(task: QueueTask) {
    this.queue.push(task)
    this._flush()
  }

  private async _flush() {
    if (this.running)
      return
    this.running = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      try {
        await task()
      }
      catch (e: any) {
        logger.error('[依赖管理] 队列任务异常', e?.message ?? e)
      }
    }
    this.running = false
  }
}

const _queue = new SerialQueue()
let _syncLock: 'idle' | 'running' = 'idle'

function spawnDepScript(args: string[]): Promise<{ stdout: string, stderr: string, code: number }> {
  return new Promise((resolve) => {
    execFile('bash', [DEP_SCRIPT, ...args], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      const code = error?.code ?? (error ? 1 : 0)
      resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code: typeof code === 'number' ? code : 0 })
    })
  })
}

/**
 * 初始化依赖管理系统，同步依赖安装状态
*/
export async function initDepManagerSystem(): Promise<void> {
  try {
    await syncDepsCore()
  }
  catch (e: any) {
    logger.error('[依赖管理] 同步安装状态异常', e?.message ?? e)
  }
}

export async function syncDeps(): Promise<{ updated: number }> {
  if (_syncLock === 'running') {
    throw new Error('已有同步任务在运行中，请稍后再试')
  }
  return syncDepsCore()
}

async function syncDepsCore(): Promise<{ updated: number }> {
  _syncLock = 'running'
  let updated = 0
  try {
    for (const eco of ECOSYSTEMS) {
      const installedMap = await _fetchInstalledMap(eco)
      const deps = await db.dependencyManage.$list({ where: { ecosystem: eco } })
      for (const dep of deps) {
        // 跳过正在操作中的记录，避免覆盖进行中的状态
        if (dep.status === DepStatus.INSTALLING || dep.status === DepStatus.UNINSTALLING)
          continue
        const base = getBaseName(eco, dep.name)
        const ver = installedMap.get(base.toLowerCase()) ?? ''
        const newStatus = ver ? DepStatus.INSTALLED : DepStatus.NOT_INSTALLED
        if (dep.installed_ver !== ver || dep.status !== newStatus) {
          await db.dependencyManage.$updateById({
            id: dep.id,
            data: { installed_ver: ver, status: newStatus },
          })
          updated++
        }
      }
    }
    return { updated }
  }
  finally {
    _syncLock = 'idle'
  }
}

async function _fetchInstalledMap(ecosystem: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const { stdout, code } = await spawnDepScript(['list', ecosystem])
  if (code !== 0 || !stdout.trim())
    return map

  try {
    if (ecosystem === 'npm') {
      const data = JSON.parse(stdout) as Record<string, { version: string }>
      for (const [k, v] of Object.entries(data)) {
        map.set(k.toLowerCase(), v.version)
      }
    }
    else if (ecosystem === 'pnpm') {
      // pnpm ls --json 输出 [{dependencies:{pkg:{version}}}] 数组格式
      const data = JSON.parse(stdout) as Array<{ dependencies?: Record<string, { version: string }> }>
      const deps = data[0]?.dependencies ?? {}
      for (const [k, v] of Object.entries(deps)) {
        map.set(k.toLowerCase(), v.version)
      }
    }
    else if (ecosystem === 'pip') {
      const data = JSON.parse(stdout) as Array<{ name: string, version: string }>
      for (const pkg of data) {
        map.set(pkg.name.toLowerCase(), pkg.version)
      }
    }
    else if (ecosystem === 'apt') {
      for (const line of stdout.split('\n')) {
        const parts = line.split('\t')
        if (parts.length >= 2) {
          map.set(parts[0].toLowerCase(), parts[1])
        }
      }
    }
    else if (ecosystem === 'gem' || ecosystem === 'luarocks') {
      // 这两个生态的 list_all 均输出 JSON: { "pkgname": { "version": "x.y.z" }, ... }
      const data = JSON.parse(stdout) as Record<string, { version: string }>
      for (const [k, v] of Object.entries(data)) {
        map.set(k.toLowerCase(), v.version)
      }
    }
  }
  catch {
    // ignore parse error
  }
  return map
}

export function enqueueInstall(deps: Array<{ id: number, name: string, ecosystem: string }>) {
  for (const dep of deps) {
    _queue.add(() => _runInstallOne(dep))
  }
}

async function _runInstallOne(dep: { id: number, name: string, ecosystem: string }) {
  try {
    await db.dependencyManage.$updateById({ id: dep.id, data: { status: DepStatus.INSTALLING, last_error: '' } })
    socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.INSTALLING })

    const { stdout, stderr, code } = await spawnDepScript(['install', dep.ecosystem, dep.name])
    const output = [stdout, stderr].filter(Boolean).join('\n').trim()

    if (code === 0) {
      let ver = ''
      try {
        ver = await _queryVersion(dep.ecosystem, dep.name)
      }
      catch (e: any) {
        logger.error(`[依赖管理] 查询 ${dep.ecosystem}/${dep.name} 版本失败`, e?.message ?? e)
      }
      await db.dependencyManage.$updateById({
        id: dep.id,
        data: { status: DepStatus.INSTALLED, installed_ver: ver, last_error: '' },
      })
      socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.INSTALLED, installed_ver: ver })
    }
    else {
      await db.dependencyManage.$updateById({
        id: dep.id,
        data: { status: DepStatus.FAILED, last_error: output.slice(0, 8000) },
      })
      socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.FAILED, last_error: output.slice(0, 8000) })
    }
  }
  catch (e: any) {
    logger.error(`[依赖管理] 安装 ${dep.ecosystem}/${dep.name} 失败`, e?.message ?? e)
    try {
      await db.dependencyManage.$updateById({ id: dep.id, data: { status: DepStatus.FAILED, last_error: String(e?.message ?? e).slice(0, 8000) } })
      socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.FAILED })
    }
    catch {}
  }
}

export function enqueueUninstall(deps: Array<{ id: number, name: string, ecosystem: string }>) {
  for (const dep of deps) {
    _queue.add(() => _runUninstallOne(dep))
  }
}

async function _runUninstallOne(dep: { id: number, name: string, ecosystem: string }) {
  try {
    await db.dependencyManage.$updateById({ id: dep.id, data: { status: DepStatus.UNINSTALLING, last_error: '' } })
    socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.UNINSTALLING })

    const base = getBaseName(dep.ecosystem, dep.name)
    const { stdout, stderr, code } = await spawnDepScript(['uninstall', dep.ecosystem, base])
    const output = [stdout, stderr].filter(Boolean).join('\n').trim()

    if (code === 0) {
      await db.dependencyManage.$updateById({
        id: dep.id,
        data: { status: DepStatus.NOT_INSTALLED, installed_ver: '', last_error: '' },
      })
      socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.NOT_INSTALLED, installed_ver: '' })
    }
    else {
      await db.dependencyManage.$updateById({
        id: dep.id,
        data: { status: DepStatus.FAILED, last_error: output.slice(0, 8000) },
      })
      socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.FAILED, last_error: output.slice(0, 8000) })
    }
  }
  catch (e: any) {
    logger.error(`[依赖管理] 卸载 ${dep.ecosystem}/${dep.name} 失败`, e?.message ?? e)
    try {
      await db.dependencyManage.$updateById({ id: dep.id, data: { status: DepStatus.FAILED, last_error: String(e?.message ?? e).slice(0, 8000) } })
      socketCommon.emit(socketEventName, { id: dep.id, status: DepStatus.FAILED })
    }
    catch { /* ignore db error in recovery */ }
  }
}

async function _queryVersion(ecosystem: string, name: string): Promise<string> {
  const base = getBaseName(ecosystem, name)
  const { stdout } = await spawnDepScript(['version', ecosystem, base])
  return stdout.trim()
}
