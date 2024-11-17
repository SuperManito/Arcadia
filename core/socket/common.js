/* eslint-disable no-restricted-globals */
const socketCommon = {
  getSocket() {
    return global.io
  },
  setSocket(io) {
    global.io = io
  },
  emit(name, data) {
    const io = this.getSocket()
    if (io) {
      io.emit(name, data)
    }
  },
}
module.exports = socketCommon
