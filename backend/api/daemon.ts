import type { Express, Request, Response } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { validateCronExpression } from '../core/cron/engine'
import {
  checkNameAvailable,
  deleteDaemonTask,
  deleteProcessByName,
  flushDaemonTaskLog,
  getAllProcessStatuses,
  getDaemonLogFilePath,
  getDaemonTaskLog,
  getProcessStatus,
  isSystemProcessName,
  restartDaemonTask,
  startDaemonTask,
  stopDaemonTask,
  trimDaemonTaskLog,
  updateDaemonCron,
} from '../core/daemon'
import db from '../db'
import { cleanProperties, validateRequestParams } from '../utils'

export const API: Express = express()

const DAEMON_TASK_FIELDS = [
  'name',
  'file_path',
  'description',
  'boot_start',
  'max_restarts',
  'restart_delay',
  'restart_cron',
  'autorestart',
  'max_memory_restart',
  'stop_exit_codes',
  'exp_backoff_restart_delay',
  'envs',
  'options',
  'log_dir',
  'log_name',
  'log_max_lines',
  'active',
]

/**
 * 获取守护任务列表（附带 PM2 实时状态）
 */
API.get('/', async (_request: Request, response: Response) => {
  try {
    const tasks = await db.daemonTask.findMany({ orderBy: { id: 'asc' } })
    const statusMap = await getAllProcessStatuses(tasks.map(t => t.name))
    const result = tasks.map((task) => {
      const pm2Status = statusMap.get(task.name) ?? { status: 'not-started' as const }
      return {
        ...task,
        created_at: new Date(task.created_at),
        updated_at: new Date(task.updated_at),
        pm2_status: pm2Status.status,
        pid: pm2Status.pid,
        pm_uptime: pm2Status.pm_uptime,
        restart_time: pm2Status.restart_time,
        memory: pm2Status.memory,
        log_path: task.log_name ? getDaemonLogFilePath({ log_dir: task.log_dir, log_name: task.log_name }) : '',
      }
    })
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 保存守护任务（创建或更新）
 * - 不传 id：创建
 * - 传 id：更新
 */
API.post('/save', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [false, 'number']],
        ['name', [false, 'string']],
        ['file_path', [false, 'string']],
        ['description', [false, 'string', true]],
        ['boot_start', [false, 'number']],
        ['max_restarts', [false, 'number']],
        ['restart_delay', [false, 'number']],
        ['restart_cron', [false, 'string', true]],
        ['autorestart', [false, 'number']],
        ['max_memory_restart', [false, 'number']],
        ['stop_exit_codes', [false, 'number']],
        ['exp_backoff_restart_delay', [false, 'number']],
        ['envs', [false, 'string', true]],
        ['options', [false, 'string', true]],
        ['log_dir', [false, 'string', true]],
        ['log_name', [false, 'string', true]],
        ['log_max_lines', [false, 'number']],
        ['active', [false, 'number']],
      ] as const,
    })

    const { id } = params.body
    const data = cleanProperties(params.body, DAEMON_TASK_FIELDS)

    if (id) {
      // ── 更新 ──
      const existing = await db.daemonTask.findFirst({ where: { id } })
      if (!existing) {
        return response.send(API_STATUS_CODE.fail('任务不存在'))
      }

      // 名称变更校验
      if (data.name && data.name !== existing.name) {
        if (isSystemProcessName(data.name)) {
          return response.send(API_STATUS_CODE.fail('该名称为系统保留进程名'))
        }
        const nameCheck = await checkNameAvailable(data.name, id)
        if (!nameCheck.available) {
          return response.send(API_STATUS_CODE.fail(nameCheck.reason || '名称已被占用'))
        }
      }

      // 定时重启表达式校验
      if (data.restart_cron !== undefined && data.restart_cron !== '') {
        try {
          validateCronExpression(data.restart_cron)
        }
        catch (e: any) {
          return response.send(API_STATUS_CODE.fail(e.message))
        }
      }

      const record = await db.daemonTask.update({ where: { id }, data })

      // 名称变更时清理旧 PM2 进程，防止孤儿进程
      if (data.name && data.name !== existing.name) {
        const oldStatus = await getProcessStatus(existing.name)
        await deleteProcessByName(existing.name)
        // 如果旧进程正在运行，以新名称自动重启
        if (oldStatus.status === 'online' || oldStatus.status === 'launching') {
          await startDaemonTask(id).catch(() => {})
        }
      }

      // 更新定时重启
      if (record.active === 1 && record.restart_cron) {
        updateDaemonCron(record.id, record.restart_cron)
      }
      else {
        updateDaemonCron(record.id, '')
      }

      response.send(API_STATUS_CODE.okData(record))
    }
    else {
      // ── 创建 ──
      if (!data.name || !data.file_path) {
        return response.send(API_STATUS_CODE.fail('创建任务需要提供 name 和 file_path'))
      }

      if (isSystemProcessName(data.name)) {
        return response.send(API_STATUS_CODE.fail('该名称为系统保留进程名'))
      }
      const nameCheck = await checkNameAvailable(data.name)
      if (!nameCheck.available) {
        return response.send(API_STATUS_CODE.fail(nameCheck.reason || '名称已被占用'))
      }

      if (data.restart_cron) {
        try {
          validateCronExpression(data.restart_cron)
        }
        catch (e: any) {
          return response.send(API_STATUS_CODE.fail(e.message))
        }
      }

      // id 已由 cleanProperties 排除，name 和 file_path 已在上方校验
      const { id: _id, ...createData } = data as Record<string, unknown>
      const record = await db.daemonTask.create({ data: createData as any })

      if (record.restart_cron && record.active === 1) {
        updateDaemonCron(record.id, record.restart_cron)
      }

      response.send(API_STATUS_CODE.okData(record))
    }
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 删除守护任务
 */
API.delete('/', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ] as const,
    })
    await deleteDaemonTask(params.body.id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 统一操作接口：start / restart / stop / flush
 */
API.post('/action', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
        ['action', [true, 'string']],
      ] as const,
    })

    const { id, action } = params.body

    switch (action) {
      case 'start':
        await startDaemonTask(id)
        break
      case 'stop':
        await stopDaemonTask(id)
        break
      case 'restart':
        await restartDaemonTask(id)
        break
      case 'flush':
        await flushDaemonTaskLog(id)
        break
      default:
        return response.send(API_STATUS_CODE.fail(`不支持的操作: ${action}`))
    }

    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 检测名称是否可用
 */
API.get('/check', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['name', [true, 'string']],
        ['excludeId', [false, 'string']],
      ] as const,
    })
    const excludeId = params.query.excludeId ? Number.parseInt(params.query.excludeId) : undefined
    const result = await checkNameAvailable(params.query.name, excludeId)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取守护任务日志
 */
API.get('/log', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      query: [
        ['id', [true, 'string']],
        ['startLine', [false, 'string']],
      ] as const,
    })
    const id = Number.parseInt(params.query.id)
    if (Number.isNaN(id) || id <= 0) {
      return response.send(API_STATUS_CODE.fail('参数 id 无效'))
    }
    const startLine = params.query.startLine ? Number.parseInt(params.query.startLine) : undefined
    const result = await getDaemonTaskLog(id, startLine)
    response.send(API_STATUS_CODE.okData(result))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 手动裁剪日志
 */
API.post('/log/trim', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['id', [true, 'number']],
      ] as const,
    })
    await trimDaemonTaskLog(params.body.id)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})
