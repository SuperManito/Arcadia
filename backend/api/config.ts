import type { Express, Request, Response } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { getCliModuleConfig, updateConfigValue } from '../core/config'
import { ConfigKeyCli, ConfigModule } from '../core/type/config'
import { generateCliConfigSh } from '../core/config/cli'

export const API: Express = express()

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
    const body = request.body as Partial<Record<ConfigKeyCli, string>>
    const validKeys = new Set(Object.values(ConfigKeyCli))
    const updates: Promise<any>[] = []
    for (const [key, value] of Object.entries(body)) {
      if (!validKeys.has(key as ConfigKeyCli)) {
        return response.send(API_STATUS_CODE.fail(`无效的配置键: ${key}`))
      }
      if (typeof value !== 'string') {
        return response.send(API_STATUS_CODE.fail(`配置值必须为字符串: ${key}`))
      }
      updates.push(updateConfigValue(key as ConfigKeyCli, ConfigModule.CLI, value))
    }
    if (updates.length === 0) {
      return response.send(API_STATUS_CODE.fail('没有可更新的配置项'))
    }
    await Promise.all(updates)
    await generateCliConfigSh()
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '更新 CLI 配置失败'))
  }
})
