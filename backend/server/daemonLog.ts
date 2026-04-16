import type { Server, Socket } from 'socket.io'
import { closeSync, existsSync, openSync, readSync, statSync, watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { Buffer } from 'node:buffer'
import db from '../db'
import { getDaemonLogFilePath } from '../core/daemon'

// 单次推送最大字节数，超出时只读最新部分
const MAX_EMIT_BYTES = 1 * 1024 * 1024 // 1 MB

interface LogWatchState {
  taskId: number
  filePath: string
  lastSize: number
  watcher: FSWatcher
}

const watchStates = new Map<string, LogWatchState>()

function cleanupWatch(socketId: string): void {
  const state = watchStates.get(socketId)
  if (state) {
    try {
      state.watcher.close()
    }
    catch {}
    watchStates.delete(socketId)
  }
}

function startWatching(socket: Socket, taskId: number, filePath: string): void {
  cleanupWatch(socket.id)

  let lastSize = 0
  if (existsSync(filePath)) {
    try {
      lastSize = statSync(filePath).size
    }
    catch {}
  }

  let watcher: FSWatcher
  try {
    watcher = watch(filePath, { persistent: false }, (eventType) => {
      if (eventType !== 'change')
        return
      try {
        if (!existsSync(filePath)) {
          lastSize = 0
          return
        }
        const newSize = statSync(filePath).size
        if (newSize > lastSize) {
          const total = newSize - lastSize
          const len = Math.min(total, MAX_EMIT_BYTES)
          const offset = newSize - len
          const buf = Buffer.alloc(len)
          const fd = openSync(filePath, 'r')
          readSync(fd, buf, 0, len, offset)
          closeSync(fd)
          lastSize = newSize
          socket.emit('daemon:log:data', buf.toString('utf-8'))
        }
        else if (newSize < lastSize) {
          // 日志被裁剪，重置位置
          lastSize = newSize
        }
      }
      catch {}
    })
  }
  catch {
    // 文件不存在时 watch 可能报错，忽略
    return
  }

  watchStates.set(socket.id, { taskId, filePath, lastSize, watcher })
}

/**
 * 初始化守护任务日志实时推送命名空间 /daemon-log
 */
export function initDaemonLogServer(io: Server): void {
  const ns = io.of('/daemon-log')

  ns.on('connection', (socket: Socket) => {
    socket.on('daemon:log:subscribe', async ({ id }: { id: number }) => {
      try {
        const task = await db.daemonTask.findFirst({ where: { id } })
        if (!task || !task.log_name)
          return
        const filePath = getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name })
        startWatching(socket, id, filePath)
      }
      catch {}
    })

    socket.on('daemon:log:unsubscribe', () => {
      cleanupWatch(socket.id)
    })

    socket.on('disconnect', () => {
      cleanupWatch(socket.id)
    })
  })
}
