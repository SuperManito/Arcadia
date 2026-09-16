import { SocketEvent } from '../core/type/socket'
import type { Server, Socket } from 'socket.io'
import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import db from '../db'
import { getDaemonLogFilePath } from '../core/daemon'

// 单次推送最大字节数，超出时只读最新部分
const MAX_EMIT_BYTES = 1024 * 1024 // 1 MB
const FLUSH_INTERVAL_MS = 50

interface LogWatchState {
  taskId: number
  filePath: string
  lastSize: number
  watcher: FSWatcher
  timer: NodeJS.Timeout | null
  flushing: boolean
}

const watchStates = new Map<string, LogWatchState>()

function cleanupWatch(socketId: string): void {
  const state = watchStates.get(socketId)
  if (state) {
    if (state.timer) {
      clearTimeout(state.timer)
    }
    try {
      state.watcher.close()
    }
    catch {}
    watchStates.delete(socketId)
  }
}

async function flushLog(state: LogWatchState, socket: Socket): Promise<void> {
  if (state.flushing) {
    return
  }
  state.flushing = true
  try {
    const fileStat = await stat(state.filePath)
    if (!fileStat.isFile()) {
      return
    }
    const newSize = fileStat.size
    if (newSize > state.lastSize) {
      const total = newSize - state.lastSize
      const len = Math.min(total, MAX_EMIT_BYTES)
      const offset = newSize - len
      const buf = Buffer.alloc(len)
      const fd = await open(state.filePath, 'r')
      let bytesRead = 0
      try {
        bytesRead = (await fd.read(buf, 0, len, offset)).bytesRead
        state.lastSize = newSize
      }
      finally {
        await fd.close()
      }
      if (socket.connected && bytesRead > 0) {
        socket.emit(SocketEvent.DAEMON_LOG_DATA, buf.subarray(0, bytesRead).toString('utf-8'))
      }
    }
    else if (newSize < state.lastSize) {
      // 日志被裁剪，重置位置
      state.lastSize = newSize
    }
  }
  catch (err) {
    // 文件被删除时重置位置，等待重新创建
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      state.lastSize = 0
    }
  }
  finally {
    state.flushing = false
  }
}

function scheduleFlush(state: LogWatchState, socket: Socket): void {
  if (state.timer) {
    return
  }
  state.timer = setTimeout(() => {
    state.timer = null
    void flushLog(state, socket)
  }, FLUSH_INTERVAL_MS)
}

async function startWatching(socket: Socket, taskId: number, filePath: string): Promise<void> {
  cleanupWatch(socket.id)

  let lastSize = 0
  try {
    const fileStat = await stat(filePath)
    if (fileStat.isFile()) {
      lastSize = fileStat.size
    }
  }
  catch {}

  let watcher: FSWatcher
  let state: LogWatchState | undefined
  try {
    watcher = watch(filePath, { persistent: false }, (eventType) => {
      if (eventType !== 'change') {
        return
      }
      if (state) {
        scheduleFlush(state, socket)
      }
    })
    watcher.on('error', () => {
      cleanupWatch(socket.id)
    })
  }
  catch {
    // 文件不存在时 watch 可能报错，忽略
    return
  }

  state = { taskId, filePath, lastSize, watcher, timer: null, flushing: false }
  watchStates.set(socket.id, state)
}

/**
 * 初始化守护任务日志实时推送
 */
export function initDaemonLogServer(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on(SocketEvent.DAEMON_LOG_SUBSCRIBE, async (payload: unknown) => {
      try {
        const id = typeof payload === 'object' && payload !== null ? (payload as { id?: unknown }).id : undefined
        if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
          return
        }
        const task = await db.daemonTask.$getById(id)
        if (!task || !task.log_name) {
          return
        }
        const filePath = getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name })
        await startWatching(socket, id, filePath)
      }
      catch {}
    })

    socket.on(SocketEvent.DAEMON_LOG_UNSUBSCRIBE, () => {
      cleanupWatch(socket.id)
    })

    socket.on('disconnect', () => {
      cleanupWatch(socket.id)
    })
  })
}
