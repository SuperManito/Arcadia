import type { Express, Request, Response } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import { validateRequestParams } from '../../utils'
import { getCliModuleConfig, getSystemModuleConfig, updateCliConfigValues, updateSystemConfigValues } from '../../core/config'
import { ConfigKeyCli, ConfigKeySystem } from '../../core/type/config'
import { generateCliConfigSh } from '../../core/config/cli'
import { applySystemTimezone, depSetSource } from '../../core/config/system'
import { registerCleanupCron } from '../../core/cron/cleanup'

export const API: Express = express()

// 系统配置键与软件包生态的映射
const SYSTEM_KEY_ECOSYSTEM: Partial<Record<ConfigKeySystem, 'npm' | 'pip' | 'apt' | 'gem'>> = {
  [ConfigKeySystem.NPM_REGISTRY]: 'npm',
  [ConfigKeySystem.PIP_INDEX_URL]: 'pip',
  [ConfigKeySystem.APT_MIRROR_URL]: 'apt',
  [ConfigKeySystem.GEM_REGISTRY]: 'gem',
}

/**
 * 获取 CLI 功能配置
 */
API.get('/cli', async (_request: Request, response: Response) => {
  try {
    const config = await getCliModuleConfig()
    response.send(API_STATUS_CODE.okData(config))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '获取 CLI 配置失败'))
  }
})

/**
 * 更新 CLI 功能配置
 */
API.post('/cli', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['REMOVE_LOG_DAYS_AGO', [false, 'string', true]],
        ['ENABLE_UPDATE_EXTRA', [false, 'string', true]],
        ['ENABLE_UPDATE_EXTRA_SYNC_FILE', [false, 'string', true]],
        ['UPDATE_EXTRA_SYNC_FILE_URL', [false, 'string', true]],
        ['ENABLE_INIT_EXTRA', [false, 'string', true]],
        ['ENABLE_TASK_BEFORE_EXTRA', [false, 'string', true]],
        ['ENABLE_TASK_AFTER_EXTRA', [false, 'string', true]],
        ['ENABLE_AUTO_DELETE_REMOTE_FILE', [false, 'string', true]],
        ['ENABLE_CUSTOM_NOTIFY', [false, 'string', true]],
        ['RUN_DELAY_MAX_SECONDS', [false, 'string', true]],
        ['DEFAULT_JS_RUNTIME', [false, 'string', true]],
        ['DEFAULT_TS_RUNTIME', [false, 'string', true]],
        ['ENABLE_PYTHON_UV', [false, 'string', true]],
      ] as const,
    }, true)
    const body = params.body
    const validKeys = new Set(Object.values(ConfigKeyCli))
    const updates: Array<{ key: ConfigKeyCli, value: string }> = []
    for (const [key, value] of Object.entries(body)) {
      if (!validKeys.has(key as ConfigKeyCli)) {
        return response.send(API_STATUS_CODE.fail(`无效的配置键: ${key}`))
      }
      updates.push({ key: key as ConfigKeyCli, value })
    }
    if (updates.length === 0) {
      return response.send(API_STATUS_CODE.fail('没有可更新的配置项'))
    }
    await updateCliConfigValues(updates)
    await generateCliConfigSh()
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '更新 CLI 配置失败'))
  }
})

/**
 * 获取系统通用配置
 */
API.get('/system', async (_request: Request, response: Response) => {
  try {
    const config = await getSystemModuleConfig()
    response.send(API_STATUS_CODE.okData(config))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '获取系统配置失败'))
  }
})

/**
 * 更新系统通用配置
 */
API.post('/system', async (request: Request, response: Response) => {
  try {
    const params = validateRequestParams(request, {
      body: [
        ['timezone', [false, 'string']],
        ['npmRegistry', [false, 'string', true]],
        ['pipIndexUrl', [false, 'string', true]],
        ['aptMirrorUrl', [false, 'string', true]],
        ['gemRegistry', [false, 'string', true]],
        ['serverLogRetentionDays', [false, 'string', true]],
        ['loginLogRetentionDays', [false, 'string', true]],
        ['openApiLogRetentionDays', [false, 'string', true]],
        ['messageRetentionDays', [false, 'string', true]],
        ['taskHistoryRetentionDays', [false, 'string', true]],
        ['cleanupCronExpression', [false, 'string', true]],
        ['cleanupCronEnabled', [false, 'string', true]],
      ] as const,
    }, true)
    const body = params.body
    const validKeys = new Set(Object.values(ConfigKeySystem))
    const updates: Array<{ key: ConfigKeySystem, value: string }> = []
    const sideEffects: Array<{ key: ConfigKeySystem, value: string }> = []
    for (const [param, value] of Object.entries(body)) {
      if (!validKeys.has(param as ConfigKeySystem)) {
        return response.send(API_STATUS_CODE.fail(`无效的配置键: ${param}`))
      }
      const configKey = param as ConfigKeySystem
      updates.push({ key: configKey, value })
      sideEffects.push({ key: configKey, value })
    }
    if (updates.length === 0) {
      return response.send(API_STATUS_CODE.fail('没有可更新的配置项'))
    }
    await updateSystemConfigValues(updates)
    for (const { key, value } of sideEffects) {
      if (key === ConfigKeySystem.TIMEZONE && value) {
        applySystemTimezone(value)
      }
      // 软件源仅在传入非空值时才立即应用，空值保留 DB 记录但不重置工具配置
      const ecosystem = SYSTEM_KEY_ECOSYSTEM[key]
      if (ecosystem && value) {
        depSetSource(ecosystem, value)
      }
      // 定时清理 cron 配置变化时重新注册
      if (key === ConfigKeySystem.CLEANUP_CRON_EXPRESSION) {
        registerCleanupCron(value).catch(() => {})
      }
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '更新系统配置失败'))
  }
})
