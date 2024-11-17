const events = require('node:events')

module.exports = {
  db: new events.EventEmitter(),
  web: new events.EventEmitter(),
  task: new events.EventEmitter(),
}
