import fs from 'node:fs'
import { APP_FILE_PATH } from '../core/type'
import type { ComboEnvsGroupModel, envsModel } from '../db'

/**
 * 校验环境变量名
 */
export function validateEnvName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('名称不能为空')
  }
  if (!/^[A-Z_]\w*$/i.test(name)) {
    throw new Error(`非法名称："${name}"（只允许字母、数字和下划线，且不能以数字开头）`)
  }
}

/**
 * 任务队列状态管理
 */
interface QueueState {
  isRunning: boolean
  pendingTask: (() => void | Promise<void>) | null
}

const queueMap = new Map<string, QueueState>()

/**
 * 创建一个队列化的任务执行器
 * 策略：立即执行第一个任务，忽略队列中间任务，只保留最后一个任务
 * @param key 队列标识符
 * @param task 要执行的任务
 */
export async function queueTask(key: string, task: () => void | Promise<void>) {
  let state = queueMap.get(key)

  if (!state) {
    state = { isRunning: false, pendingTask: null }
    queueMap.set(key, state)
  }

  // 如果没有任务在运行，立即执行
  if (!state.isRunning) {
    state.isRunning = true
    try {
      await task()
    }
    finally {
      state.isRunning = false
      // 检查是否有待执行的任务
      if (state.pendingTask) {
        const nextTask = state.pendingTask
        state.pendingTask = null
        await queueTask(key, nextTask)
      }
    }
  }
  else {
    // 如果有任务在运行，替换待执行任务（忽略之前的待执行任务）
    state.pendingTask = task
  }
}

/**
 * 生成环境变量批量声明脚本
 */
export function generateEnvSh(group: ComboEnvsGroupModel[], items: envsModel[]) {
  // 使用队列执行，避免频繁写入
  queueTask('generateEnvSh', () => {
    let header = '#!/bin/bash'
    header += '\n# This file is auto generated, please do not modify it manually'
    header += '\n# 本文件由系统自动生成，请勿手动修改\n'
    const lines = [header]
      ;(items || [])
      .filter((item) => item.enable || item.enable === undefined)
      .forEach((it) => {
        // if (it.description) {
        //   lines.push(`# ${it.description.replace(/\n/g, ' ')}`)
        // }
        lines.push(`export ${it.type}='${it.value.replace(/'/g, '\'"\'"\'')}'`)
      })
    group.forEach((g) => {
      if (!g.enable) {
        return
      }
      // if (g.description) {
      //   lines.push(`# 变量组 ${g.description.replace(/\n/g, ' ')}`)
      // }
      const it = (g.envs || [])
        .filter((item) => item.enable || item.enable === undefined)
        .sort((a, b) => a.sort - b.sort)
      if (it.length > 0) {
        const separator = g.separator || ''
        it.forEach((item, i) => {
          // lines.push(`# ${i + 1} ${g.remark ? item.remark.replace(/\n/g, ' ') : g.description.replace(/\n/g, ' ')}`)
          if (i === 0) {
            lines.push(`export ${g.type}='${item.value.replace(/'/g, '\'"\'"\'')}'`)
          }
          else {
            lines.push(`export ${g.type}=$\{${g.type}}'${separator}${item.value.replace(/'/g, '\'"\'"\'')}'`)
          }
        })
        lines.push('')
      }
      else {
        lines.push(`export ${g.type}=''`)
      }
    })
    fs.writeFileSync(APP_FILE_PATH.ENV, `${lines.join('\n')}\n`)
  })
}
