const express = require('express')
const api = express()
const apiOpen = express()
const { API_STATUS_CODE } = require('../http')
const { logger } = require('../logger')

const fs = require('node:fs')
const nodePath = require('node:path')
const multer = require('multer')
const {
  getFile,
  getFileTree,
  saveFile,
  fileRename,
  fileDelete,
  pathCheck,
  fileDownload,
  fileMove,
  rootPathCheck,
  fileCreate,
  fileInfo,
  getFileList,
} = require('../file')
const { APP_ROOT_DIR, APP_DIR_TYPE, APP_DIR_PATH, APP_FILE_PATH } = require('../type')
const { validateParams } = require('../utils')

/**
 * 获取文件列表
 */
api.get('/list', (request, response) => {
  try {
    const path = request.query.path || APP_ROOT_DIR
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(getFileList(path)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/list', (request, response) => {
  try {
    validateParams(request, [
      ['query', 'path', [true, 'string']],
    ])
    const path = request.query.path || APP_ROOT_DIR
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(getFileList(path)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 处理文件树接口传参
 */
function handleFileTreeParams(query) {
  const type = query.type || 'all'
  const search = query.search || ''
  const startTime = query.startTime || ''
  const endTime = query.endTime || ''
  const onlyDir = query.onlyDir === 'true'
  return { type, search, startTime, endTime, onlyDir }
}

/**
 * 获取文件树
 */
api.get('/tree', (request, response) => {
  try {
    const params = handleFileTreeParams(request.query)
    response.send(API_STATUS_CODE.okData(getFileTree('all', APP_ROOT_DIR, params)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取指定类型的文件树
 */
api.get('/tree/:type', (request, response) => {
  try {
    const type = request.params.type
    const params = handleFileTreeParams(request.query)
    params.type = type
    if (Object.keys(APP_DIR_TYPE).includes(type.toUpperCase()) || type === 'all') {
      response.send(API_STATUS_CODE.okData(getFileTree(type, type === 'all' ? APP_ROOT_DIR : APP_DIR_PATH[type.toUpperCase()], params)))
    }
    else {
      response.send(API_STATUS_CODE.fail('参数错误'))
    }
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 获取文件内容
 */
api.get('/content', (request, response) => {
  try {
    const path = request.query.path
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(getFile(path)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/content', (request, response) => {
  try {
    validateParams(request, [
      ['query', 'path', [true, 'string']],
    ])
    const path = request.query.path
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(getFile(path)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 保存文件内容
 */
api.post('/content', (request, response) => {
  try {
    const { path, content } = request.body
    pathCheck(path)
    saveFile(path, content)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    logger.error('文件保存失败', e)
    response.send(API_STATUS_CODE.fail(`保存失败：${e.message}`))
  }
})

apiOpen.post('/v1/content', (request, response) => {
  try {
    validateParams(request, [
      ['body', 'path', [true, 'string']],
      ['body', 'content', [true, 'string', true]],
    ])
    const { path, content } = request.body
    pathCheck(path)
    saveFile(path, content)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    logger.error('文件保存失败', e)
    response.send(API_STATUS_CODE.fail(`保存失败：${e.message}`))
  }
})

/**
 * 查看文件/目录属性（详细信息）
 */
api.get('/info', (request, response) => {
  try {
    const path = request.query.path
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(fileInfo(path)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

apiOpen.get('/v1/info', (request, response) => {
  try {
    validateParams(request, [
      ['query', 'path', [true, 'string']],
    ])
    const path = request.query.path
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(fileInfo(path)))
  }
  catch (e) {
    response.send(API_STATUS_CODE.fail(e.message || e))
  }
})

/**
 * 重命名文件/目录
 */
api.post('/rename', (request, response) => {
  try {
    const { path, name } = request.body
    pathCheck(path)
    fileRename(path, name)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    logger.error('文件或目录重命名失败', e)
    response.send(API_STATUS_CODE.fail(`重命名失败：${e.message || e}`))
  }
})

apiOpen.post('/v1/rename', (request, response) => {
  try {
    validateParams(request, [
      ['body', 'path', [true, 'string']],
      ['body', 'name', [true, 'string']],
    ])
    const { path, name } = request.body
    pathCheck(path)
    fileRename(path, name)
    response.send(API_STATUS_CODE.ok())
    logger.info('[OpenAPI · File]', '文件或目录重命名', path, name)
  }
  catch (e) {
    logger.error('文件或目录重命名失败', e)
    response.send(API_STATUS_CODE.fail(`重命名失败：${e.message || e}`))
  }
})

/**
 * 移动文件/目录
 */
api.post('/move', (request, response) => {
  try {
    const { path: oldPath, newPath } = request.body
    pathCheck(oldPath)
    rootPathCheck(newPath)
    fileMove(oldPath, newPath)
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    logger.error('文件或目录移动失败', e)
    response.send(API_STATUS_CODE.fail(`移动失败：${e.message || e}`))
  }
})

apiOpen.post('/v1/move', (request, response) => {
  try {
    const { path: oldPath, newPath } = request.body
    pathCheck(oldPath)
    rootPathCheck(newPath)
    fileMove(oldPath, newPath)
    response.send(API_STATUS_CODE.ok())
    logger.info('[OpenAPI · File]', '文件或目录移动', oldPath, newPath)
  }
  catch (e) {
    logger.error('文件或目录移动失败', e)
    response.send(API_STATUS_CODE.fail(`移动失败：${e.message || e}`))
  }
})

/**
 * 创建文件/目录
 */
api.post('/create', (request, response) => {
  try {
    const { path, name, type } = request.body
    rootPathCheck(path)
    response.send(API_STATUS_CODE.okData(fileCreate(path, name, type)))
  }
  catch (e) {
    logger.error('文件或目录创建失败', e)
    response.send(API_STATUS_CODE.fail(`创建失败：${e.message || e}`))
  }
})

apiOpen.post('/v1/create', (request, response) => {
  try {
    validateParams(request, [
      ['body', 'path', [true, 'string']],
      ['body', 'name', [true, 'string']],
      ['body', 'type', [true, ['folder', 'file']]],
    ])
    const { path, name, type } = request.body
    rootPathCheck(path)
    response.send(API_STATUS_CODE.okData(fileCreate(path, name, type)))
  }
  catch (e) {
    logger.error('文件或目录创建失败', e)
    response.send(API_STATUS_CODE.fail(`创建失败：${e.message || e}`))
  }
})

/**
 * 删除文件/目录
 */
api.delete('/delete', (request, response) => {
  try {
    const path = request.body.path
    let files
    if (Array.isArray(path)) {
      files = request.body.path.map((path) => path)
    }
    else {
      files = [path]
    }
    for (const filePath of files) {
      logger.info('删除文件', filePath)
      pathCheck(filePath)
      fileDelete(filePath)
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    logger.error('文件或目录删除失败', e)
    response.send(API_STATUS_CODE.fail(`删除失败：${e.message || e}`))
  }
})

apiOpen.delete('/v1/delete', (request, response) => {
  try {
    validateParams(request, [
      ['body', 'path', [true, 'string | string[]']],
    ])
    const path = request.body.path
    let files
    if (Array.isArray(path)) {
      files = request.body.path.map((path) => path)
    }
    else {
      files = [path]
    }
    for (const filePath of files) {
      logger.info('[OpenAPI · File]', '删除文件', filePath)
      pathCheck(filePath)
      fileDelete(filePath)
    }
    response.send(API_STATUS_CODE.ok())
  }
  catch (e) {
    logger.error('文件或目录删除失败', e)
    response.send(API_STATUS_CODE.fail(`删除失败：${e.message || e}`))
  }
})

/**
 * 下载文件
 */
api.get('/download', (request, response) => {
  try {
    const path = request.query.path
    pathCheck(path)
    fileDownload(path, response)
  }
  catch (e) {
    logger.error('文件或目录下载失败', e)
    response.send(API_STATUS_CODE.fail(`下载失败：${e.message || e}`))
  }
})

apiOpen.get('/v1/download', (request, response) => {
  try {
    validateParams(request, [
      ['query', 'path', [true, 'string']],
    ])
    const path = request.query.path
    pathCheck(path)
    fileDownload(path, response)
    logger.info('[OpenAPI · File]', '文件或目录下载', path)
  }
  catch (e) {
    logger.error('文件或目录下载失败', e)
    response.send(API_STATUS_CODE.fail(`下载失败：${e.message || e}`))
  }
})

/**
 * 文件上传（仅支持单文件，不支持目录）
 */
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const savePath = req.query.path
      rootPathCheck(savePath)
      let stat = null
      try {
        stat = fs.statSync(savePath)
      }
      catch (err) {
        if (err.code === 'ENOENT') {
          fs.mkdirSync(savePath, { recursive: true })
        }
        else {
          return cb(err)
        }
      }
      if (stat && !stat.isDirectory()) {
        return cb(new Error('路径不是一个目录'))
      }
      cb(null, savePath)
    },
    filename(req, file, cb) {
      // 解决中文名乱码的问题
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
      const savePath = req.query.path
      let originalName = file.originalname
      // 文件操作限制（认证文件保护）
      if (nodePath.join(savePath, originalName) === APP_FILE_PATH.AUTH) {
        originalName += '.json'
      }
      // 检查文件名中的非法字符
      originalName = originalName.replace(/[<>:"/\\|?*]+/g, '_')
      cb(null, originalName)
    },
  }),
})
api.post('/upload', upload.single('file'), (request, response) => {
  response.send(
    API_STATUS_CODE.ok({
      fileName: request.file.originalname,
      filePath: request.file.path,
    }),
  )
})

apiOpen.post('/v1/upload', upload.single('file'), (request, response) => {
  response.send(
    API_STATUS_CODE.ok({
      fileName: request.file.originalname,
      filePath: request.file.path,
    }),
  )
})

// /**
//  * 多文件上传
//  */
// api.post('/upload/multi', upload.array('file'), (request, response) => {
//   const fileList = request.files.map((elem) => {
//     return {
//       fileName: elem.originalname,
//       filePath: elem.path,
//     }
//   })
//   response.send(API_STATUS_CODE.ok(fileList))
// })

module.exports = {
  API: api,
  OpenAPI: apiOpen,
}
