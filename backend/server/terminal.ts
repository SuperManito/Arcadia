import type { Server, Socket } from 'socket.io'
import { APP_ROOT_DIR } from '../core/type'
// import { logger } from '../utils/logger'

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

  const cols = Math.min(Math.max(options.cols || 80, 1), 500)
  const rows = Math.min(Math.max(options.rows || 24, 1), 200)
  const cwd = options.cwd || APP_ROOT_DIR
  const shell = getShell()

  // 如果指定了 command，通过 shell -c 执行
  const args = options.command ? ['-c', options.command] : []

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
 * 基于 Socket.IO 的 /terminal 命名空间，复用主 io 实例的认证中间件
 */
export async function initTerminalServer(io: Server) {
  await loadNodePty()

  const terminalNs = io.of('/terminal')

  terminalNs.on('connection', (socket: Socket) => {
    // logger.info(`Terminal socket connected: ${socket.id}`)

    socket.on('terminal:spawn', (options: {
      cols?: number
      rows?: number
      cwd?: string
      command?: string
    } = {}) => {
      // 每个 socket 只允许一个 PTY 会话
      if (sessions.has(socket.id)) {
        socket.emit('terminal:error', 'Session already exists')
        return
      }

      let ptyProcess: IPty
      try {
        ptyProcess = createPtyProcess(options)
      }
      catch (err) {
        // logger.error('Failed to create PTY process:', err)
        socket.emit('terminal:error', 'Failed to create terminal')
        return
      }

      sessions.set(socket.id, ptyProcess)
      // logger.info(`Terminal session created (sid: ${socket.id}, pid: ${ptyProcess.pid}, sessions: ${sessions.size})`)

      // PTY → 客户端
      ptyProcess.onData((data: string) => {
        socket.emit('terminal:output', data)
      })

      // PTY 退出
      ptyProcess.onExit(({ exitCode }) => {
        socket.emit('terminal:exit', exitCode)
        sessions.delete(socket.id)
        // logger.info(`Terminal session ended (sid: ${socket.id}, code: ${exitCode})`)
      })

      socket.emit('terminal:ready')
    })

    // 客户端 → PTY
    socket.on('terminal:input', (data: string) => {
      const pty = sessions.get(socket.id)
      if (pty) {
        pty.write(data)
      }
    })

    // 终端尺寸调整
    socket.on('terminal:resize', (size: { cols: number, rows: number }) => {
      const pty = sessions.get(socket.id)
      if (pty && typeof size.cols === 'number' && typeof size.rows === 'number') {
        const cols = Math.min(Math.max(size.cols, 1), 500)
        const rows = Math.min(Math.max(size.rows, 1), 200)
        pty.resize(cols, rows)
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
