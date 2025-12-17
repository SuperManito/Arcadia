import type { Express, Request, Response } from 'express'
import express from 'express'
import { API_STATUS_CODE } from '../utils/httpUtil'
import { createToken, deleteToken, listTokens, updateToken } from './openApi'

const api: Express = express()

/**
 * 创建访问令牌
 */
api.post('/', async (request: Request, response: Response) => {
  try {
    const { name, expire_time } = request.body
    const token = await createToken({
      name: name?.trim(),
      expire_time: expire_time ? new Date(expire_time) : null,
    })
    response.send(API_STATUS_CODE.okData(token))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '创建失败'))
  }
})

/**
 * 获取访问令牌列表
 */
api.get('/', async (_request: Request, response: Response) => {
  try {
    const tokens = await listTokens()
    response.send(API_STATUS_CODE.okData(tokens))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '获取列表失败'))
  }
})

/**
 * 更新访问令牌
 */
api.put('/', async (request: Request, response: Response) => {
  try {
    const { id, name, expire_time, enable } = request.body
    if (!id || Number.isNaN(Number(id))) {
      return response.send(API_STATUS_CODE.fail('无效的 ID'))
    }
    const updateData: any = {}
    if (name !== undefined) {
      updateData.name = name.trim()
    }
    if (expire_time !== undefined) {
      updateData.expire_time = expire_time ? new Date(expire_time) : null
    }
    if (enable !== undefined) {
      updateData.enable = enable === 0 ? 0 : 1
    }
    const token = await updateToken(Number(id), updateData)
    response.send(API_STATUS_CODE.okData(token))
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '更新失败'))
  }
})

/**
 * 删除访问令牌
 */
api.delete('/', async (request: Request, response: Response) => {
  try {
    const { id } = request.body
    if (!id || Number.isNaN(Number(id))) {
      return response.send(API_STATUS_CODE.fail('无效的 ID'))
    }
    await deleteToken(Number(id))
    response.send(API_STATUS_CODE.ok())
  }
  catch (e: any) {
    response.send(API_STATUS_CODE.fail(e.message || '删除失败'))
  }
})

export const systemApi: Express = express()

/**
 * 健康检测
 */
systemApi.get('/health', async (_request, response) => {
  response.send(API_STATUS_CODE.okData(true))
})

export const API = api
