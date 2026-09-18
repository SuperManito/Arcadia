import type { Server } from 'socket.io'
import type { SocketEvent } from '../core/type/socket'

export const socketCommon = {
  getSocket() {
    return globalThis.io
  },
  setSocket(io: Server) {
    globalThis.io = io
  },
  emit(name: SocketEvent, data: any) {
    const io = this.getSocket()
    if (io) {
      io.emit(name, data)
    }
  },
}
