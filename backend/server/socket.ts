import { SocketEvent } from '../core/type/socket'
import type { Request } from 'express'
import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import type { JwtPayload, VerifyCallback } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { getJwtSecretSync } from '../core/config'
import type { taskRunInfo } from '../core/cron/taskRunner'
import type { tasksModel } from '../db'
import { socketCommon } from './socketCommon'

declare module 'http' {
  interface IncomingMessage {
    username?: JwtPayload | string
  }
}

function getToken(req: Request) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1] as string
  }
  return undefined
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = getToken(socket.request as Request)
  if (!token) {
    next(new Error('unauthorized'))
    return
  }
  jwt.verify(token, getJwtSecretSync(), { algorithms: ['HS256'] }, ((err, decoded) => {
    if (err) {
      next(new Error('unauthorized'))
    }
    else {
      socket.request.username = decoded
      next()
    }
  }) as VerifyCallback)
}

export function initSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'POST'],
      allowedHeaders: ['Authorization'],
      credentials: true,
    },
    path: '/api/ws',
    serveClient: false,
  })

  // Socket.IO 认证中间件
  io.use(socketAuthMiddleware)

  io.on('connection', (_socket) => {
    // const user = socket.request.user
    // logger.info('用户已建立 WebSocket 连接')
  })
  return io
}

export function emitTaskStarted(task: Pick<tasksModel, 'id' | 'name' | 'type'>, manual: boolean) {
  socketCommon.emit(SocketEvent.TASK_STARTED, {
    taskId: task.id,
    taskName: task.name,
    taskType: task.type,
    manual,
    startTime: Date.now(),
  })
}

export function emitTaskCompleted(info: taskRunInfo) {
  socketCommon.emit(SocketEvent.TASK_COMPLETED, {
    taskId: info.task.id,
    taskName: info.task.name,
    taskType: info.task.type,
    manual: info.manual,
    completedTime: Date.now(),
    duration: info.duration,
    success: info.success,
  })
}
