import events from 'node:events'

export const db = new events.EventEmitter()
export const web = new events.EventEmitter()
export const task = new events.EventEmitter()
