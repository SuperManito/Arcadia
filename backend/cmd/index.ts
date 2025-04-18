import { APP_ROOT_DIR } from '../type'
import { exec } from 'node:child_process'

/**
 * 执行 Shell 命令
 *
 */
export function execShell(cmd: string, config: { callback: (error: any, stdout: string, stderr: string) => any, onChange?: (data: object, type: 'stdout' | 'stderr') => any, onExit?: (code: number) => any, onException?: (error: any) => any }) {
  try {
    const process = exec(`cd ${APP_ROOT_DIR} ; ${cmd}`, {
      encoding: 'utf8',
      shell: '/bin/bash',
      maxBuffer: 1024 * 1024 * 10, // 10M
    }, config.callback)
    if (config.onExit) {
      process.on('exit', config.onExit)
    }
    const onChange = config.onChange
    if (onChange) {
      process.stdout?.on('data', (data) => onChange(data, 'stdout'))
      process.stderr?.on('data', (data) => onChange(data, 'stderr'))
    }
    return process
  }
  catch (e: any) {
    try {
      config.onException && config.onException(e)
    }
    finally {
      config.onExit && config.onExit(1)
    }
  }
}
