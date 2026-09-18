import type { Server, Socket } from 'socket.io'
import { SocketEvent } from '../core/type/socket'
import { APP_ROOT_DIR } from '../core/type'
import { socketAuthMiddleware } from './socket'
// import { logger } from '../utils/logger'

const MAX_PTY_SESSIONS = 20

interface IPty {
  pid: number
  cols: number
  rows: number
  onData: (callback: (data: string) => void) => void
  onExit: (callback: (e: { exitCode: number, signal?: number }) => void) => void
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: (signal?: string) => void
}

const sessions = new Map<string, IPty>()

let ptyModule: typeof import('node-pty') | null = null

async function loadNodePty() {
  if (!ptyModule) {
    ptyModule = await import('node-pty')
  }
  return ptyModule
}

function getShell(): string {
  return process.env.SHELL || '/bin/bash'
}

function createPtyProcess(options: {
  cols?: number
  rows?: number
  cwd?: string
  command?: string
}): IPty {
  if (!ptyModule) {
    throw new Error('node-pty module not loaded')
  }

  const cols = typeof options.cols === 'number' && Number.isFinite(options.cols)
    ? Math.min(Math.max(Math.floor(options.cols), 1), 500)
    : 80
  const rows = typeof options.rows === 'number' && Number.isFinite(options.rows)
    ? Math.min(Math.max(Math.floor(options.rows), 1), 200)
    : 24
  const cwd = typeof options.cwd === 'string' && options.cwd ? options.cwd : APP_ROOT_DIR
  const command = typeof options.command === 'string' ? options.command : undefined
  const shell = getShell()

  // 如果指定了 command，通过 shell -c 执行
  const args = command ? ['-c', command] : []

  return ptyModule.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    } as Record<string, string>,
  })
}

/**
 * 初始化终端服务
 * 基于 Socket.IO 的 /terminal 命名空间，复用主 IO 的认证与连接上限中间件
 */
export async function initTerminalServer(io: Server) {
  await loadNodePty()

  const terminalNs = io.of('/terminal')

  terminalNs.use(socketAuthMiddleware)

  terminalNs.on('connection', (socket: Socket) => {
    // logger.info(`Terminal socket connected: ${socket.id}`)

    socket.on(SocketEvent.TERMINAL_SPAWN, (options: {
      cols?: number
      rows?: number
      cwd?: string
      command?: string
    } = {}) => {
      if (!options || typeof options !== 'object') {
        socket.emit(SocketEvent.TERMINAL_ERROR, 'Invalid terminal options')
        return
      }

      // 每个 socket 只允许一个 PTY 会话
      if (sessions.has(socket.id)) {
        socket.emit(SocketEvent.TERMINAL_ERROR, 'Session already exists')
        return
      }
      if (sessions.size >= MAX_PTY_SESSIONS) {
        socket.emit(SocketEvent.TERMINAL_ERROR, 'Terminal session limit reached')
        return
      }

      let ptyProcess: IPty
      try {
        ptyProcess = createPtyProcess(options)
      }
      catch {
        // logger.error('Failed to create PTY process:', err)
        socket.emit(SocketEvent.TERMINAL_ERROR, 'Failed to create terminal')
        return
      }

      sessions.set(socket.id, ptyProcess)
      // logger.info(`Terminal session created (sid: ${socket.id}, pid: ${ptyProcess.pid}, sessions: ${sessions.size})`)

      // PTY → 客户端
      ptyProcess.onData((data: string) => {
        socket.emit(SocketEvent.TERMINAL_OUTPUT, data)
      })

      // PTY 退出
      ptyProcess.onExit(({ exitCode }) => {
        socket.emit(SocketEvent.TERMINAL_EXIT, exitCode)
        sessions.delete(socket.id)
        // logger.info(`Terminal session ended (sid: ${socket.id}, code: ${exitCode})`)
      })

      socket.emit(SocketEvent.TERMINAL_READY)
    })

    // 客户端 → PTY
    socket.on(SocketEvent.TERMINAL_INPUT, (data: string) => {
      const pty = sessions.get(socket.id)
      if (pty && typeof data === 'string') {
        try {
          pty.write(data)
        }
        catch {}
      }
    })

    // 终端尺寸调整
    socket.on(SocketEvent.TERMINAL_RESIZE, (size: { cols: number, rows: number }) => {
      const pty = sessions.get(socket.id)
      if (pty && size && typeof size === 'object' && typeof size.cols === 'number' && typeof size.rows === 'number' && Number.isFinite(size.cols) && Number.isFinite(size.rows)) {
        try {
          const cols = Math.min(Math.max(size.cols, 1), 500)
          const rows = Math.min(Math.max(size.rows, 1), 200)
          pty.resize(cols, rows)
        }
        catch {}
      }
    })

    // 断开连接时清理
    socket.on('disconnect', () => {
      const pty = sessions.get(socket.id)
      if (pty) {
        pty.kill()
        sessions.delete(socket.id)
        // logger.info(`Terminal session cleaned up (sid: ${socket.id}, sessions: ${sessions.size})`)
      }
    })
  })

  // logger.info('Terminal namespace initialized on /terminal')
}

export function cleanupTerminalSessions() {
  for (const [id, pty] of sessions.entries()) {
    pty.kill()
    sessions.delete(id)
  }
}
