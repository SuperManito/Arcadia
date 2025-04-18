import type { Response } from 'express'
import { dateToFileName, getDateStr, isNotEmpty, parseFileNameDate, randomString } from '../utils'
import { API_STATUS_CODE } from '../http'
import { logger } from '../logger'
import nodePath from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import archiver from 'archiver'
import { exec, execSync } from 'node:child_process'
import { APP_DIR_PATH, APP_DIR_TYPE, APP_FILE_NAME, APP_FILE_PATH, APP_FILE_TYPE, APP_FILE_TYPES, APP_ROOT_DIR } from '../type'

// 底层Shell已适配可执行代码文件类型的后缀
const canRunCodeFileExtList = [
  'js',
  'mjs',
  'cjs',
  'py',
  'ts',
  'go',
  'lua',
  'rb',
  'rs',
  'pl',
  'c',
  'sh',
]
const excludeRegExp = /(user\.session)|(\.cache$)|(\.check$)|(\.git$)|(\.tmp$)|(__pycache__$)|(node_modules)/ // 全局过滤正则

interface FileList {
  title: string // 目录名
  path: string // 目录路径
  type: APP_FILE_TYPES // 文件类型
  updated_at: Date // 修改时间
  created_at: Date // 创建时间
  children: FileListItem[]
}

interface FileListItem {
  name: string // 文件或目录名称
  path: string // 文件或目录路径
  type: APP_FILE_TYPES // 文件类型
  updated_at: Date // 修改时间
  created_at: Date // 创建时间
}

interface FileTree {
  path: string // 绝对路径
  title: string // 目录名称
  type: APP_FILE_TYPES // 文件类型
  updated_at: Date // 修改时间
  created_at: Date // 创建时间
  children: (FileTree | FileTreeItem)[]
}

interface FileTreeItem {
  name: string // 文件或目录名称
  path: string // 文件或目录路径
  type: APP_FILE_TYPES // 文件类型
  updated_at: Date // 修改时间
  created_at: Date // 创建时间
}

export interface FileTreeParams {
  type: APP_DIR_TYPE
  search: string
  startTime: Date | string
  endTime: Date | string
  onlyDir: boolean
}

export interface CodeFileResolveResult {
  path: string
  runPath: string
  name: string
  cron: string
  tags: string
}

/**
 * 获取文件列表（仅一层，非递归）
 *
 * @param {string} dirPath - 目录路径
 * @returns {object}
 */
export function getFileList(dirPath: string): FileList {
  const files = fs.readdirSync(dirPath)
  const dirStats = fs.statSync(dirPath)
  const result: FileList = {
    // 构造文件夹数据
    path: dirPath,
    title: nodePath.basename(dirPath),
    type: APP_FILE_TYPES.FOLDER,
    updated_at: dirStats.mtime,
    created_at: dirStats.birthtime,
    children: [],
  }
  result.children = sortFilesAndFolders(
    files
      .filter((item) => {
        return !excludeRegExp.test(item)
      })
      .map((file) => {
        const subPath = nodePath.join(dirPath, file)
        const stats = fs.statSync(subPath)
        return {
          path: subPath,
          name: file,
          type: stats.isDirectory() ? APP_FILE_TYPES.FOLDER : APP_FILE_TYPES.FILE,
          updated_at: stats.mtime,
          created_at: stats.birthtime,
        }
      }) as FileListItem[],
    true,
  )
  return result
}

/**
 * 目录树（递归）
 *
 * @param {string} type - 类型 APP_DIR_TYPE
 * @param {string} dirPath - 目录路径
 * @param {object} params - 参数
 * @returns {*[]}
 */
export function getFileTree(type: APP_DIR_TYPE, dirPath: string, params: FileTreeParams): (FileTree | FileTreeItem)[] {
  if (!fs.existsSync(dirPath)) {
    return []
  }
  const parentDir = dirPath
  const filterPaths = [APP_FILE_PATH.DB, APP_FILE_PATH.AUTH] // 默认过滤的文件路径

  const options = (({ search = '', startTime = '', endTime = '', onlyDir = false, type = APP_DIR_TYPE.ALL }: FileTreeParams) => {
    if (type === APP_DIR_TYPE.LOG) {
      startTime = startTime || ''
      endTime = endTime || ''
    }
    return { search, startTime, endTime, onlyDir }
  })(params)

  // 处理过滤参数
  const handleFilterParams = (parentDir: string, item: any, options: any) => {
    const { search = '', startTime = '', endTime = '', onlyDir } = options
    if (item.type === APP_FILE_TYPES.FILE && onlyDir) {
      return false
    }
    const matchesSearch = search === '' || item.path.replace(parentDir, '').includes(search)
    const matchesStartTime = startTime === '' || fileNameTimeCompare(item.name, startTime) >= 0
    const matchesEndTime = endTime === '' || fileNameTimeCompare(item.name, endTime) <= 0
    return matchesSearch && matchesStartTime && matchesEndTime
  }

  // 递归读取目录
  const readDirs = (dirPath: string) => {
    const dirStats = fs.statSync(dirPath)
    const result: FileTree = {
      path: dirPath,
      title: nodePath.basename(dirPath),
      type: APP_FILE_TYPES.FOLDER,
      updated_at: dirStats.mtime,
      created_at: dirStats.birthtime,
      children: [],
    }
    const files = fs.readdirSync(dirPath)
    const children: (FileTree | FileTreeItem)[] = sortFilesAndFolders(
      files
        .filter((item) => {
          return !excludeRegExp.test(item) && !filterPaths.includes(nodePath.join(dirPath, item))
        })
        .map((file) => {
          const subPath = nodePath.join(dirPath, file)
          const stats = fs.statSync(subPath)
          if (stats.isDirectory()) {
            return readDirs(subPath)
          }
          return {
            path: subPath,
            name: file,
            type: APP_FILE_TYPES.FILE,
            updated_at: stats.mtime,
            created_at: stats.birthtime,
          }
        })
        .filter((item) => {
          return handleFilterParams(parentDir, item, options) && !filterPaths.includes(item.path)
        }) as (FileTree | FileTreeItem)[],
      true,
    )
    if (type === APP_DIR_TYPE.LOG) {
      children.sort((a, b) => {
        // 只对文件进行排序
        if (a.type === APP_FILE_TYPES.FOLDER && b.type === APP_FILE_TYPES.FOLDER) {
          return 0
        }
        // 目录排在前面
        if (a.type === APP_FILE_TYPES.FOLDER) {
          return -1
        }
        if (b.type === APP_FILE_TYPES.FOLDER) {
          return 1
        }
        return Number(b.updated_at) - Number(a.updated_at)
      })
    }
    result.children = children
    return result
  }

  let result: (FileTree | FileTreeItem)[]
  if (type === APP_DIR_TYPE.ALL || type === APP_DIR_TYPE.ROOT) {
    filterPaths.push(APP_DIR_PATH.LOG)
    result = readDirs(APP_ROOT_DIR).children
  }
  else {
    result = readDirs(dirPath).children
  }
  return result
}

/**
 * 文件目录排序（使文件夹排在数组中位置靠前）
 *
 * @param array 需要排序的数组
 * @param isAsc 是否升序
 * @returns {*[]}
 */
function sortFilesAndFolders(array: any[] = [], isAsc: boolean = true): any[] {
  array.sort((a, b) => {
    const typeOrder = { [APP_FILE_TYPES.FOLDER]: 0, [APP_FILE_TYPES.FILE]: 1 }
    return isAsc ? typeOrder[a.type] - typeOrder[b.type] : typeOrder[b.type] - typeOrder[a.type]
  })
  return array
}

/**
 * 比较文件名中的时间
 *
 * @param {string} fileName - 文件名称 yyyy-MM-dd-HH-mm-ss
 * @param {string} time - 时间 yyyy-MM-dd hh:mm:ss
 * @return {number} 差异时间
 * @description 结果是正整数则 fileName 的时间大，反之则 time 的时间大
 */
function fileNameTimeCompare(fileName: string, time: Date | string): number {
  try {
    const fileTime = parseFileNameDate(fileName)
    const dateTime = new Date(time)
    return fileTime.getTime() - dateTime.getTime()
  }
  catch {
    return 0
  }
}

/**
 * 去除文件内容中携带的命令行 ANSI 转义字符
 *
 * @param {string} content - 原始内容
 * @returns {string}
 */
export function getNeatContent(content: string): string {
  if (!content)
    return content
  const ansiRegex = ({ onlyFirst = false } = {}) => {
    // eslint-disable-next-line regexp/no-trivially-nested-quantifier, regexp/no-useless-quantifier, regexp/prefer-w, regexp/no-useless-non-capturing-group, regexp/no-useless-escape
    const pattern = ['[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)', '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'].join('|')
    return new RegExp(pattern, onlyFirst ? undefined : 'g')
  }
  try {
    return content.replace(ansiRegex(), '')
  }
  catch {
    return content
  }
}

/**
 * 检查主配置文件是否存在（初始化）
 */
export function checkConfigFile() {
  if (!fs.existsSync(APP_FILE_PATH.CONFIG)) {
    console.error('服务启动失败，config.sh 文件不存在！')
    process.exit(1)
  }
}

/**
 * 初始化应用配置
 */
export function initAppConfig() {
  // 检查配置文件是否存在
  checkConfigFile()
  // 创建目录
  if (!fs.existsSync(APP_DIR_PATH.SCRIPTS)) {
    fs.mkdirSync(APP_DIR_PATH.SCRIPTS)
  }
  if (!fs.existsSync(APP_DIR_PATH.REPO)) {
    fs.mkdirSync(APP_DIR_PATH.REPO)
  }
  if (!fs.existsSync(APP_DIR_PATH.RAW)) {
    fs.mkdirSync(APP_DIR_PATH.RAW)
  }
  // 初始化认证密钥
  const authFileJson = getJsonFile(APP_FILE_TYPE.AUTH)
  if (!isNotEmpty(authFileJson.openApiToken)) {
    authFileJson.openApiToken = randomString(32)
  }
  if (!isNotEmpty(authFileJson.jwtSecret)) {
    authFileJson.jwtSecret = randomString(16)
  }
  saveNewConf(APP_FILE_TYPE.AUTH, authFileJson, true)
}

/**
 * 备份配置文件，并返回旧的文件内容
 */
function bakConfigFile(file: string) {
  // 检查 config/bak/ 备份目录是否存在，不存在则创建
  if (!fs.existsSync(APP_DIR_PATH.CONFIG_BAK)) {
    fs.mkdirSync(APP_DIR_PATH.CONFIG_BAK)
  }
  const date = new Date()
  const bakDir = nodePath.join(APP_DIR_PATH.CONFIG_BAK, getDateStr(date))
  if (!fs.existsSync(bakDir)) {
    fs.mkdirSync(bakDir)
  }
  const bakFilePath = `${bakDir}/${file}_${dateToFileName(date)}`
  let oldConfContent = ''
  switch (file) {
    case APP_FILE_TYPE.CONFIG:
      oldConfContent = getFileContentByName(APP_FILE_PATH.CONFIG)
      fs.writeFileSync(bakFilePath, oldConfContent)
      break
    default:
      break
  }
  return oldConfContent
}

/**
 * 校验主配置文件合法性（检测是否报错）
 */
function checkConfigSave(oldContent: string) {
  if (os.type() === 'Linux') {
    // 判断格式是否正确
    try {
      execSync(`bash ${APP_FILE_PATH.CONFIG} >${APP_DIR_PATH.LOG}/.check`, { encoding: 'utf8' })
    }
    catch (e: any) {
      fs.writeFileSync(APP_FILE_PATH.CONFIG, oldContent)
      let errorMsg: string | null,
        line: string | null
      try {
        const errorMsgMatch = /(?<=line\s\d*:)([^"]+)/.exec(e.message)
        const lineMatch = /(?<=line\s)\d*/.exec(e.message)
        if (errorMsgMatch && lineMatch) {
          errorMsg = errorMsgMatch[0] ?? ''
          line = lineMatch[0] ?? ''
          if (errorMsg && line) {
            throw new Error(`第 ${line} 行：${errorMsg}`)
          }
        }
      }
      catch (e: any) {
        throw new Error(e.message)
      }
    }
  }
}

/**
 * 保存配置文件
 *
 * @param {string} file
 * @param {string} content
 * @param {boolean} isBak - 是否备份
 */
export function saveNewConf(file: string, content: string, isBak: boolean = true) {
  const oldContent = isBak ? bakConfigFile(file) : ''
  switch (file) {
    case APP_FILE_TYPE.CONFIG:
    case APP_FILE_NAME.CONFIG:
      // 备份旧的文件到 bak 目录
      fs.writeFileSync(APP_FILE_PATH.CONFIG, content)
      isBak && checkConfigSave(oldContent)
      break
    case APP_FILE_TYPE.AUTH:
      fs.writeFileSync(APP_FILE_PATH.AUTH, JSON.stringify(content, null, 2))
      break
    default:
      break
  }
}

/**
 * 获取文件内容
 *
 * @param fileKey
 * @return {string}
 */
export function getFile(fileKey: string): string {
  let content: string
  switch (fileKey) {
    case APP_FILE_TYPE.CONFIG:
      content = getFileContentByName(APP_FILE_PATH.CONFIG)
      break
    case APP_FILE_TYPE.AUTH:
      content = getFileContentByName(APP_FILE_PATH.AUTH)
      break
    default:
      content = getFileContentByName(fileKey)
      break
  }
  return content
}

/**
 * 根据文件名称获取文件内容
 *
 * @param filePath 文件路径
 * @returns {string}
 */
function getFileContentByName(filePath: string): string {
  if (fs.existsSync(filePath)) {
    return getNeatContent(fs.readFileSync(filePath, 'utf8'))
  }
  return ''
}

/**
 * 获取 Json 文件内容
 *
 * @param fileKey
 * @return {object}
 */
export function getJsonFile(fileKey: string): any {
  return JSON.parse(getFile(fileKey))
}

/**
 * 保存文件内容
 *
 * @param filePath
 * @param content
 */
export function saveFile(filePath: string, content: string) {
  pathCheck(filePath)
  if (filePath === APP_FILE_PATH.CONFIG) {
    saveNewConf(APP_FILE_TYPE.CONFIG, content, true)
    return
  }
  // 将换行符强制替换为 LF（Unix）
  if (canRunCodeFileExtList.some((ext) => filePath.endsWith(`.${ext}`))) {
    content = content.replace(/\r\n/g, '\n')
  }
  fs.writeFileSync(filePath, content)
}

/**
 * 目录参数检查
 *
 * @param checkPath
 */
export function rootPathCheck(checkPath: string) {
  if (!checkPath.startsWith(APP_ROOT_DIR)) {
    throw new Error('非法操作')
  }
}

/**
 * 路径以及操作合法性检查
 *
 * @param checkPath
 */
export function pathCheck(checkPath: string) {
  rootPathCheck(checkPath)
  if (!fs.existsSync(checkPath)) {
    throw new Error('文件（夹）不存在')
  }
  // 文件操作限制（认证文件保护）
  if (APP_FILE_PATH.AUTH === nodePath.join(checkPath)) {
    throw new Error('该文件无法进行操作')
  }
}

/**
 * 重命名
 *
 * @param filePath 当前路径
 * @param name 名称
 */
export function fileRename(filePath: string, name: string) {
  const parentPath = nodePath.join(filePath, '../')
  fs.renameSync(filePath, nodePath.join(parentPath, name))
}

/**
 * 清空目录（删除指定目录下所有子文件或文件夹）
 *
 * @param folderPath 目录路径
 */
function clearDirectory(folderPath: string) {
  const files = fs.readdirSync(folderPath)
  files.forEach((file) => {
    const filePath = `${folderPath}/${file}`
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      clearDirectory(filePath)
      fs.rmdirSync(filePath)
    }
    else {
      fs.unlinkSync(filePath)
    }
  })
}

/**
 * 文件（夹）删除
 *
 * @param filePath 当前路径
 */
export function fileDelete(filePath: string) {
  const file = fs.statSync(filePath)
  if (file.isDirectory()) {
    clearDirectory(filePath)
    fs.rmdirSync(filePath)
    return
  }
  fs.unlinkSync(filePath)
}

/**
 * 文件（夹）移动
 *
 * @param filePath 当前路径
 * @param newPath 目标路径
 */
export function fileMove(filePath: string, newPath: string) {
  fs.renameSync(filePath, newPath)
}

/**
 * 文件下载
 *
 * @param {string} fileOrFolderPath
 * @param {object} response
 */
export function fileDownload(fileOrFolderPath: string, response: Response) {
  fileOrFolderPath = nodePath.resolve(fileOrFolderPath)
  const file = fs.statSync(fileOrFolderPath)
  const fileName = nodePath.basename(fileOrFolderPath)
  if (file.isDirectory()) {
    const archive = archiver('zip', {})
    archive.on('error', (err: any) => {
      response.send(API_STATUS_CODE.fail(err.message))
    })
    archive.on('end', () => {
      logger.info('Archive wrote %d bytes', archive.pointer())
    })
    response.attachment(`${fileName}.zip`)
    archive.pipe(response)
    archive.directory(fileOrFolderPath, fileName)
    archive.finalize().then()
  }
  else {
    response.writeHead(200, {
      'Content-Type': 'application/octet-stream', // 告诉浏览器这是一个二进制文件
      'Content-Disposition': `attachment; filename=${encodeURIComponent(fileName)}`, // 告诉浏览器这是一个需要下载的文件
    })
    fs.createReadStream(fileOrFolderPath)
      .on('error', (err) => {
        response.send(API_STATUS_CODE.fail(err.message))
      })
      .pipe(response)
  }
}

/**
 * 文件创建
 *
 * @param {string} fileDir - 路径
 * @param {string} fileName - 名称 含后缀
 * @param {string} type - 0 目录 1 文件
 * @param {string} content - 内容
 */
export function fileCreate(fileDir: string, fileName: string, type: string, content: string = '') {
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir)
  }
  const filePath = nodePath.join(fileDir, fileName)
  if (fs.existsSync(filePath)) {
    throw new Error(`${fileDir}目录下已经含有${fileName}该文件（夹）`)
  }
  if (type === APP_FILE_TYPES.FOLDER) {
    fs.mkdirSync(filePath)
  }
  else {
    fs.writeFileSync(filePath, content)
  }
  return filePath
}

interface FileInfo {
  type: APP_FILE_TYPES // 文件类型
  name: string // 名称
  parent_path: string // 存储位置路径
  mode: string // 权限（3位数字）
  size: number // 大小（单位字节）
  display_size: string // 格式化大小（带单位）
  modified_time: Date // 内容最后一次被修改的时间
  accessed_time: Date // 最后一次被访问的时间
  created_time: Date // 创建时间
  changed_time: Date // 属性（如权限或链接）最后一次被更改的时间
}

/**
 * 查看文件详情
 *
 * @param {string} filePath - 路径
 */
export function fileInfo(filePath: string): FileInfo {
  const stat = fs.statSync(filePath)
  const size = !stat.isDirectory() ? stat.size : getDirectorySize(filePath)
  return {
    type: stat.isDirectory() ? APP_FILE_TYPES.FOLDER : APP_FILE_TYPES.FILE,
    name: nodePath.basename(filePath),
    parent_path: nodePath.join(filePath, '../').slice(0, -1),
    mode: (stat.mode & 0o777).toString(8),
    size,
    display_size: formatFileSize(size),
    modified_time: stat.mtime,
    accessed_time: stat.atime,
    created_time: stat.birthtime,
    changed_time: stat.ctime,
  }
}

/**
 * 格式化大小
 *
 * @param {number} size
 * @returns {string}
 */
function formatFileSize(size: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}

/**
 * 递归计算目录的总大小
 *
 * @param {string} dirPath - 目录路径
 * @returns {number} - 目录的总大小（字节）
 */
function getDirectorySize(dirPath: string): number {
  let totalSize = 0
  // 读取目录内容
  const files = fs.readdirSync(dirPath)
  files.forEach((file) => {
    const filePath = nodePath.join(dirPath, file)
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      // 如果是目录，递归计算其大小
      totalSize += getDirectorySize(filePath)
    }
    else {
      // 如果是文件，累加其大小
      totalSize += stats.size
    }
  })
  return totalSize
}

// /**
//  * 获取目录中最后修改的文件的路径
//  *
//  * @param {string} dirPath - 目录路径
//  * @returns {string} 最新文件路径
//  */
// function getLastModifyFilePath(dirPath) {
//   let filePath = ''
//   if (fs.existsSync(dirPath)) {
//     const lastmtime = 0
//     const arr = fs.readdirSync(dirPath)
//     arr.forEach((item) => {
//       const fullpath = nodePath.join(dirPath, item)
//       const stats = fs.statSync(fullpath)
//       if (stats.isFile()) {
//         if (stats.mtimeMs >= lastmtime) {
//           filePath = fullpath
//         }
//       }
//     })
//   }
//   return filePath
// }

/**
 * 解析代码文件（获取定时表达式等信息）
 *
 * @param {string} filePath - 文件路径
 */
export async function codeFileResolve(filePath: string): Promise<CodeFileResolveResult> {
  return new Promise((resolve, reject) => exec(`bash ${APP_FILE_PATH.RESOLVE_SCRIPT} ${filePath}`, (error, stdout, _stderr) => {
    if (error) {
      logger.error('解析代码文件失败', filePath, '=>', error)
      const enhancedError = new Error(`解析代码文件失败：${error.message}`)
      enhancedError.cause = error
      reject(enhancedError)
    }
    else {
      try {
        const result = stdout.split('\n').filter((it) => it.trim().length > 0)
        resolve(JSON.parse(result[result.length - 1]))
        // resolve(JSON.parse(stdout))
      }
      catch (e: any) {
        logger.error('解析代码文件失败', filePath, '=>', e)
        const parseError = new Error(`解析代码文件失败：${e.message}`)
        parseError.cause = e
        reject(parseError)
      }
    }
  }))
}
