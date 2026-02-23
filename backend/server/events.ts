import events from 'node:events'
import { addAfterTaskRun, addBeforeTaskRun } from '../core/cron/taskRunner'

export const taskEvents = new events.EventEmitter()
// task相关
;(() => {
  addBeforeTaskRun((task) => {
    taskEvents.emit('task:started', task)
  })

  addAfterTaskRun((info) => {
    taskEvents.emit('task:completed', {
      taskId: info.task.id,
      ...info,
    })
  })
})()
