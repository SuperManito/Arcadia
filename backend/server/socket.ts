import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Socket } from 'socket.io'
import { Server } from 'socket.io'
import type { ExtendedError } from 'socket.io/dist/namespace'
import type { JwtPayload, VerifyCallback } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'
import { addAfterTaskRun, addBeforeTaskRun } from '../core/cron/taskRunner'

declare module 'http' {
  interface IncomingMessage {
    username?: JwtPayload | string
  }
}

function getToken(req: Request) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1] as string
  }
  else if (req.query && req.query.token) {
    return req.query.token as string
  }
  return undefined
}

export function initSocketServer(server: HttpServer, authMiddleware: RequestHandler, jwtSecret: string) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'HEAD'],
      allowedHeaders: ['Authorization'],
      credentials: true,
    },
    path: '/api/ws',
  })

  // convert a connect middleware to a Socket.IO middleware
  const wrap = (middleware: RequestHandler) =>
    (socket: Socket, next: (err?: ExtendedError) => void) =>
      middleware(socket.request as Request, {} as Response, next as NextFunction)

  io.use(wrap(authMiddleware))

  // only allow authenticated users
  io.use((socket, next) => {
    const token = getToken(socket.request as Request)
    if (token) {
      jwt.verify(token, jwtSecret, ((err, decoded) => {
        if (err) {
          next(new Error('unauthorized'))
        }
        else {
          socket.request.username = decoded
          next()
        }
      }) as VerifyCallback)
    }
    else {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (_socket) => {
    // const user = socket.request.user
    logger.info('用户已建立 WebSocket 连接')
  })
  return io
}

/* eslint-disable no-restricted-globals */
export const socketCommon = {
  getSocket() {
    return global.io
  },
  setSocket(io: Server) {
    global.io = io
  },
  emit(name: string, data: any) {
    const io = this.getSocket()
    if (io) {
      io.emit(name, data)
    }
  },
}

// task相关
;(() => {
  addBeforeTaskRun((task) => {
    // 推送到客户端
    socketCommon.emit('task:started', {
      taskId: task.id,
      taskName: task.name,
      taskType: task.type,
      startTime: Date.now(),
    })
  })

  addAfterTaskRun((info) => {
    socketCommon.emit('task:completed', {
      taskId: info.task.id,
      taskName: info.task.name,
      taskType: info.task.type,
      completedTime: Date.now(),
      duration: info.duration,
      success: info.success,
    })
  })
})()
