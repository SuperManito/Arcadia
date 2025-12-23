import { addAfterTaskRun, addBeforeTaskRun } from '../cron/taskRunner'
import { MessageListener } from './listenMessage'

const baseWorkerDir = (() => process.platform === 'win32' ? '../../../../tmp/' : '/tmp/')()
;(() => {
  addBeforeTaskRun((task) => {
    const id = `${task.id}_${(Math.random() * 99999999).toFixed(0)}${(Math.random() * 99999999).toString(36)}`
    const workDir = `${baseWorkerDir}${id}/`;
    (task as any).$messageListener = new MessageListener(workDir, { taskId: task.id })
    task.shell = `export __MESSAGE_SEND_TO_SERVER_BASE_DIR=${workDir} ; ${task.shell}`
    // 必须最后执行,保证环境变量第一个设置
  }, 99999)

  addAfterTaskRun((info) => {
    (info.task as any).$messageListener?.stopListening()
    delete (info.task as any).$messageListener
  })
})()
