const express = require('express')
const api = express()
const { API_STATUS_CODE } = require('../core/http')
const { logger } = require('../core/logger')

const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { getFile, getDirTree, rootPath, DIR_KEY, saveFileByPath, fileRename, getNeatContent, fileDelete, pathCheck, fileDownload, fileMove, authConfigFile, rootPathCheck, fileCreate, fileInfo, getDirectory } = require('../core/file')

const queryOptions = (request) => {
  const type = request.query.type || 'all'
  const keywords = request.query.keywords || ''
  const startTime = request.query.startTime || ''
  const endTime = request.query.endTime || ''
  const isDir = request.query.isDir || false
  return { type, keywords, startTime, endTime, isDir }
}

/**
 * 获取目录树
 */
api.get('/tree', (request, response) => {
  const query = queryOptions(request)
  const type = query.type
  try {
    if (Object.keys(DIR_KEY).includes(type.toUpperCase()) || type === 'all') {
      response.send(API_STATUS_CODE.okData(getDirTree(type, type === 'all' ? rootPath : path.join(rootPath, type), query)))
    } else {
      response.send(API_STATUS_CODE.fail('参数错误'))
    }
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取目录下的文件
 */
api.get('/dir', (request, response) => {
  const path = request.query.path
  try {
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(getDirectory(path, queryOptions(request))))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取代码文件
 */
api.get('/tree/scripts', (request, response) => {
  const keywords = request.query.keywords || ''
  const startTime = request.query.startTime || ''
  const endTime = request.query.endTime || ''
  try {
    response.send(
      API_STATUS_CODE.okData(
        getDirTree('repo_scripts', rootPath, {
          keywords,
          startTime,
          endTime,
        }),
      ),
    )
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 获取文件内容
 */
api.get('/', (request, response) => {
  const path = request.query.path
  try {
    pathCheck(path)
    response.setHeader('Content-Type', 'text/plain')
    // 日志文件去掉颜色标记，其他文件暂不处理
    const content = path.includes('/log/') ? getNeatContent(getFile(path)) : getFile(path)
    response.send(API_STATUS_CODE.okData(content))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 查看文件详情
 */
api.get('/info', (request, response) => {
  const path = request.query.path
  try {
    pathCheck(path)
    response.send(API_STATUS_CODE.okData(fileInfo(path)))
  } catch (e) {
    response.send(API_STATUS_CODE.fail(e.message))
  }
})

/**
 * 保存文件
 */
api.post('/', (request, response) => {
  const path = request.body.path
  const content = request.body.content
  try {
    pathCheck(path)
    saveFileByPath(path, content)
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error('文件保存失败', e)
    response.send(API_STATUS_CODE.fail(`文件保存失败：${e.message}`))
  }
})

/**
 * 重命名
 */
api.post('/rename', (request, response) => {
  const path = request.body.path
  const name = request.body.name
  try {
    pathCheck(path)
    fileRename(path, name)
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error('文件保存失败', e)
    response.send(API_STATUS_CODE.fail(`文件重命名失败：${e.message}`))
  }
})

/**
 * 文件移动
 */
api.post('/move', (request, response) => {
  const oldPath = request.body.path
  const newPath = request.body.newPath
  try {
    pathCheck(oldPath)
    rootPathCheck(newPath)
    fileMove(oldPath, newPath)
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error('文件移动失败', e)
    response.send(API_STATUS_CODE.fail(`文件移动失败：${e.message}`))
  }
})

/**
 * 文件创建
 * @param dir 目录
 * @param name 名称 含后缀
 * @param type 0 目录 1 文件
 * @param content 内容 非必填 如果 type = 0 该参数无效
 */
api.post('/create', (request, response) => {
  const dir = request.body.dir
  const name = request.body.name
  const type = request.body.type
  const content = request.body.content || ''
  try {
    rootPathCheck(dir)
    response.send(API_STATUS_CODE.okData(fileCreate(dir, name, type, content)))
  } catch (e) {
    logger.error(`${type === 0 ? '目录' : '文件'}创建失败`, e)
    response.send(API_STATUS_CODE.fail(`${type === 0 ? '目录' : '文件'}创建失败：${e.message}`))
  }
})

/**
 * 文件删除
 */
api.delete('/', (request, response) => {
  const path = request.body.path
  let files = []
  if (Array.isArray(path)) {
    files = request.body.path.map((path) => path)
  } else {
    files = [path]
  }
  try {
    for (const filePath of files) {
      logger.info('删除文件', filePath)
      pathCheck(filePath)
      fileDelete(filePath)
    }
    response.send(API_STATUS_CODE.ok())
  } catch (e) {
    logger.error('文件删除失败', e)
    response.send(API_STATUS_CODE.fail(`文件删除失败：${e.message}`))
  }
})

/**
 * 文件下载
 */
api.get('/download', (request, response) => {
  const path = request.query.path
  try {
    pathCheck(path)
    fileDownload(path, response)
  } catch (e) {
    logger.error('文件下载失败', e)
    response.send(API_STATUS_CODE.fail(`文件下载失败：${e.message}`))
  }
})

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const savePath = req.query.path
      rootPathCheck(savePath)
      let stat = null
      try {
        stat = fs.statSync(savePath)
      } catch (err) {
        fs.mkdirSync(savePath)
      }
      if (stat && !stat.isDirectory()) {
        throw new Error('文件夹不存在')
      }
      cb(null, savePath)
    },
    filename(req, file, cb) {
      // 解决中文名乱码的问题
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')

      const savePath = req.query.path
      let originalName = file.originalname
      // 文件操作限制
      if (path.join(savePath, originalName) === authConfigFile) {
        originalName += '.json'
      }
      cb(null, originalName)
    },
  }),
})

/**
 * 单个文件上传
 */
api.post('/upload', upload.single('file'), (request, response) => {
  response.send(
    API_STATUS_CODE.ok({
      fileName: request.file.originalname,
      filePath: request.file.path,
    }),
  )
})

/**
 * 多个文件上传
 */
api.post('/upload/multi', upload.array('file'), (request, response) => {
  const fileList = request.files.map((elem) => {
    return {
      fileName: elem.originalname,
      filePath: elem.path,
    }
  })
  response.send(API_STATUS_CODE.ok(fileList))
})

module.exports.fileAPI = api
