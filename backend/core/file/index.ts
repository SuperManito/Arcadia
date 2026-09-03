import type { Response } from 'express'
import { dateFormat, parseFileNameDate } from '../../utils'
import { getFsErrorMessage, isFsError } from '../../utils/errorUtil'
import { API_STATUS_CODE } from '../../utils/httpUtil'
import { logger } from '../../utils/logger'
import nodePath from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { ZipArchive } from 'archiver'
import ansiRegex from 'ansi-regex'
import { execFile, execSync } from 'node:child_process'
import {
  APP_DIR_PATH,
  APP_DIR_TYPE,
  APP_FILE_NAME,
  APP_FILE_PATH,
  APP_FILE_TYPES,
  APP_ROOT_DIR,
} from '../type'

// 底层Shell已适配可执行代码文件类型的后缀
export const canRunCodeFileExtList = [
  'js',
  'mjs',
  'cjs',
  'py',
  'ts',
  'mts',
  'cts',
  'go',
  'lua',
  'rb',
  'rs',
  'pl',
  'c',
  'sh',
]
// 受保护的文件路径
const protectedPaths = [APP_FILE_PATH.DB]
const openApiProtectedPaths = [APP_FILE_PATH.ENV]
// 默认过滤的文件路径
const defaultFilterPaths = [APP_FILE_PATH.DB, APP_FILE_PATH.CLI_CONFIG]
// 需要自动备份的配置文件（仅限 config 目录下）
const backupConfigFileNames: string[] = [APP_FILE_NAME.CONFIG, APP_FILE_NAME.SYNC, APP_FILE_NAME.BOT]
// 全局过滤正则
const excludeRegExp = /(user\.session)|(bot\.session)|(\.cache$)|(\.check$)|(\.git$)|(\.tmp$)|(__pycache__$)|(node_modules)|(Cargo\.lock$)|(go\.sum$)|(\.gem$)|(\.bundle\/)|(\.cargo\/)|(__MACOSX\/)|(\.rbc$)|(\.luac$)|(\.o$)|(\.a$)|(\.dll$)|(\.exe$)|(\.out$)|(\.pyc$)|(\.class$)|(\.elc$)|(\.beam$)|(\.hi$)|(\.dSYM\/)|(\.ipynb_checkpoints\/)|(\.rustup\/)|(\.cargo-cache\/)|(\.luarocks\/)|(\.rbenv\/)|(\.rvm\/)|(\.cabal\/)|(\.stack-work\/)|(\.perl\/)/

interface FileList {
  title: string // 目录名
  path: string // 目录路径
  type: APP_FILE_TYPES // 文件类型
  updated_at: Date // 修改时间
  created_at: Date // 创建时间
  count?: number // 目录子项数量（仅在 showCount 选项开启时存在）
  children: FileListItem[]
}

interface FileListItem {
  name: string // 文件或目录名称
  path: string // 文件或目录路径
  type: APP_FILE_TYPES // 文件类型
  updated_at: Date // 修改时间
  created_at: Date // 创建时间
  count?: number // 目录子项数量（仅 type 为 folder 时存在，由 showCount 选项控制）
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

// fs 原生错误保留原结构，仅翻译 message
function transferFsError(err: unknown): never {
  if (err instanceof Error && isFsError(err))
    err.message = getFsErrorMessage(err)
  throw err
}

/**
 * 获取文件列表（仅一层，非递归）
 *
 * @param {string} dirPath - 目录路径
 * @param {number} [showCount] - 传入 1 时返回目录子项数量（count 字段），仅 type 为 folder 的条目包含该字段
 * @returns {object}
 */
export function getFileList(dirPath: string, showCount: boolean = false): FileList {
  let files: string[]
  let dirStats: fs.Stats
  try {
    files = fs.readdirSync(dirPath)
    dirStats = fs.statSync(dirPath)
  }
  catch (err) {
    transferFsError(err)
  }
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
      .filter(file => !excludeRegExp.test(file))
      .map((file) => {
        const subPath = nodePath.join(dirPath, file)
        const stats = fs.statSync(subPath)
        const item: FileListItem = {
          path: subPath,
          name: file,
          type: stats.isDirectory() ? APP_FILE_TYPES.FOLDER : APP_FILE_TYPES.FILE,
          updated_at: stats.mtime,
          created_at: stats.birthtime,
        }
        if (showCount && item.type === APP_FILE_TYPES.FOLDER) {
          try {
            const subFiles = fs.readdirSync(subPath).filter(f => !excludeRegExp.test(f))
            item.count = subFiles.length
          }
          catch {
            item.count = 0
          }
        }
        return item
      })
      .filter(item => !defaultFilterPaths.includes(item.path)) as FileListItem[],
    true,
  )
  if (showCount) {
    result.count = result.children.length
  }
  return result
}

/**
 * 获取文件树（递归）
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
  const filterPaths = [...defaultFilterPaths]

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
        .filter(item => handleFilterParams(parentDir, item, options)) as (FileTree | FileTreeItem)[],
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

export interface SearchFileTreeParams {
  search: string
}

export interface SearchLogFileTreeParams {
  search: string
  startTime: string
  endTime: string
}

/**
 * 全局文件搜索
 *
 * @param {object} params - 搜索参数
 * @param {string} params.search - 搜索关键字（必填）
 */
export function searchFileTree(params: SearchFileTreeParams): (FileTree | FileTreeItem)[] {
  const { search } = params
  if (!search) {
    return []
  }

  const dirPath = APP_ROOT_DIR
  if (!fs.existsSync(dirPath)) {
    return []
  }

  const filterPaths = [
    ...defaultFilterPaths,
    APP_DIR_PATH.LOG,
    APP_DIR_PATH.SRC,
    APP_DIR_PATH.SHELL,
    APP_DIR_PATH.CONFIG,
    APP_DIR_PATH.SAMPLE,
  ]

  // 关键字匹配：文件/目录名称包含关键字（区分大小写）
  const matchesSearch = (name: string) => {
    return name.includes(search)
  }

  // 递归读取目录，目录保留含匹配后代的节点
  const readDirs = (currentDir: string): FileTree => {
    const dirStats = fs.statSync(currentDir)
    const result: FileTree = {
      path: currentDir,
      title: nodePath.basename(currentDir),
      type: APP_FILE_TYPES.FOLDER,
      updated_at: dirStats.mtime,
      created_at: dirStats.birthtime,
      children: [],
    }
    const files = fs.readdirSync(currentDir)
    const children: (FileTree | FileTreeItem)[] = sortFilesAndFolders(
      files
        .filter((item) => {
          return !excludeRegExp.test(item) && !filterPaths.includes(nodePath.join(currentDir, item))
        })
        .map((file) => {
          const subPath = nodePath.join(currentDir, file)
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
          } as FileTreeItem
        })
        .filter((item) => {
          if (item.type === APP_FILE_TYPES.FOLDER) {
            // 目录名称匹配时直接保留（含匹配后代），否则仅保留有匹配后代的目录
            return matchesSearch((item as FileTree).title) || (item as FileTree).children.length > 0
          }
          return matchesSearch((item as FileTreeItem).name)
        }) as (FileTree | FileTreeItem)[],
      true,
    )
    result.children = children
    return result
  }

  return readDirs(dirPath).children
}

/**
 * 全局文件搜索（日志目录）
 *
 * @param {object} params - 搜索参数
 * @param {string} params.search - 搜索关键字（必填）
 * @param {string} params.startTime - 开始时间
 * @param {string} params.endTime - 结束时间
 */
export function searchLogFileTree(params: SearchLogFileTreeParams): (FileTree | FileTreeItem)[] {
  const { search, startTime = '', endTime = '' } = params
  if (!search) {
    return []
  }

  const dirPath = APP_DIR_PATH.LOG
  if (!fs.existsSync(dirPath)) {
    return []
  }

  // 关键字匹配：文件/目录名称包含关键字（区分大小写）
  const matchesSearch = (name: string) => {
    return name.includes(search)
  }

  // 文件过滤：.log 后缀 + 时间范围
  const matchesFileFilter = (item: FileTreeItem) => {
    if (!item.name.endsWith('.log')) {
      return false
    }
    const matchesStartTime = startTime === '' || fileNameTimeCompare(item.name, startTime) >= 0
    const matchesEndTime = endTime === '' || fileNameTimeCompare(item.name, endTime) <= 0
    return matchesStartTime && matchesEndTime
  }

  // 递归读取目录，目录保留含匹配后代的节点
  const readDirs = (currentDir: string): FileTree => {
    const dirStats = fs.statSync(currentDir)
    const result: FileTree = {
      path: currentDir,
      title: nodePath.basename(currentDir),
      type: APP_FILE_TYPES.FOLDER,
      updated_at: dirStats.mtime,
      created_at: dirStats.birthtime,
      children: [],
    }
    const files = fs.readdirSync(currentDir)
    const children: (FileTree | FileTreeItem)[] = sortFilesAndFolders(
      files
        .filter((item) => {
          return !excludeRegExp.test(item)
        })
        .map((file) => {
          const subPath = nodePath.join(currentDir, file)
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
          } as FileTreeItem
        })
        .filter((item) => {
          if (item.type === APP_FILE_TYPES.FOLDER) {
            // 目录名称匹配时直接保留（含匹配后代），否则仅保留有匹配后代的目录
            return matchesSearch((item as FileTree).title) || (item as FileTree).children.length > 0
          }
          return matchesSearch((item as FileTreeItem).name) && matchesFileFilter(item as FileTreeItem)
        }) as (FileTree | FileTreeItem)[],
      true,
    )
    children.sort((a, b) => {
      if (a.type === APP_FILE_TYPES.FOLDER && b.type === APP_FILE_TYPES.FOLDER) {
        return 0
      }
      if (a.type === APP_FILE_TYPES.FOLDER) {
        return -1
      }
      if (b.type === APP_FILE_TYPES.FOLDER) {
        return 1
      }
      return Number(b.updated_at) - Number(a.updated_at)
    })
    result.children = children
    return result
  }

  return readDirs(dirPath).children
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
  try {
    return content.replace(ansiRegex(), '')
  }
  catch {
    return content
  }
}

/**
 * 初始化文件系统
 */
export function initAppFileSystem() {
  // 检查配置文件是否存在
  // if (!fs.existsSync(APP_FILE_PATH.CONFIG)) {
  //   console.error(`服务启动失败，${APP_FILE_NAME.CONFIG} 文件不存在！`)
  //   process.exit(1)
  // }
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
}

/**
 * 备份配置文件，并返回旧的文件内容
 *
 * @param {string} filePath - 配置文件路径
 */
function bakConfigFile(filePath: string) {
  // 检查 config/bak/ 备份目录是否存在，不存在则创建
  if (!fs.existsSync(APP_DIR_PATH.CONFIG_BAK)) {
    fs.mkdirSync(APP_DIR_PATH.CONFIG_BAK)
  }
  const date = new Date()
  const ext = nodePath.extname(filePath)
  const baseName = nodePath.basename(filePath, ext)
  const bakFilePath = nodePath.join(APP_DIR_PATH.CONFIG_BAK, `${baseName}-${dateFormat('yyyy-MM-dd-hh-mm-ss', date)}${ext}`)
  const oldConfContent = getFile(filePath)
  fs.writeFileSync(bakFilePath, oldConfContent)
  return oldConfContent
}

/**
 * 是否为备份白名单内的配置文件（位于 config 目录下）
 *
 * @param {string} filePath - 文件路径
 */
function isBackupConfigFile(filePath: string): boolean {
  return nodePath.dirname(filePath) === APP_DIR_PATH.CONFIG && backupConfigFileNames.includes(nodePath.basename(filePath))
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
 * @param {string} filePath - 配置文件路径（须为备份白名单内的文件）
 * @param {string} content - 文件内容
 * @param {boolean} isBak - 是否备份
 */
export function saveNewConf(filePath: string, content: string, isBak: boolean = true) {
  const oldContent = isBak ? bakConfigFile(filePath) : ''
  try {
    fs.writeFileSync(filePath, content)
  }
  catch (err) {
    transferFsError(err)
  }
  if (isBak && nodePath.basename(filePath) === APP_FILE_NAME.CONFIG) {
    checkConfigSave(oldContent)
  }
}

/**
 * 获取文件内容
 *
 * @param filePath - 文件路径
 * @return {string}
 */
export function getFile(filePath: string): string {
  if (fs.existsSync(filePath)) {
    try {
      return getNeatContent(fs.readFileSync(filePath, 'utf8'))
    }
    catch (err) {
      transferFsError(err)
    }
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
  checkPathAccess(filePath)
  if (isBackupConfigFile(filePath)) {
    saveNewConf(filePath, content, true)
    return
  }
  // 将换行符强制替换为 LF（Unix）
  if (canRunCodeFileExtList.some((ext) => filePath.endsWith(`.${ext}`))) {
    content = content.replace(/\r\n/g, '\n')
  }
  try {
    fs.writeFileSync(filePath, content)
  }
  catch (err) {
    transferFsError(err)
  }
}

/**
 * 创建调试运行临时文件
 *
 * @param originalFilePath 原始文件路径
 * @param runId 唯一运行 ID
 * @param content 待调试的文件内容
 * @returns 临时文件绝对路径
 */
export function createDebugTempFile(originalFilePath: string, runId: string, content: string): string {
  const resolvedOriginal = nodePath.resolve(originalFilePath)
  const dir = nodePath.dirname(resolvedOriginal)
  const ext = nodePath.extname(resolvedOriginal).slice(1)
  const baseName = nodePath.basename(resolvedOriginal, `.${ext}`)
  const tempFileName = `${baseName.startsWith('.') ? baseName : `.${baseName}`}_debug_${runId}.${ext}`
  const tempFilePath = nodePath.join(dir, tempFileName)
  checkPathBoundary(tempFilePath)
  try {
    fs.writeFileSync(tempFilePath, content.replace(/\r\n/g, '\n'))
  }
  catch (err) {
    transferFsError(err)
  }
  return tempFilePath
}

/**
 * 清理调试运行产生的临时文件
 *
 * @param tempFilePath 临时文件绝对路径
 */
export function cleanDebugTempFile(tempFilePath: string): void {
  const resolvedPath = nodePath.resolve(tempFilePath)
  try {
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath)
    }
  }
  catch {}
  // 删除部分语言在编译后生成同名无后缀可执行文件
  try {
    const ext = nodePath.extname(resolvedPath).slice(1)
    const binaryPath = resolvedPath.slice(0, -(ext.length + 1))
    if (fs.existsSync(binaryPath)) {
      fs.unlinkSync(binaryPath)
    }
  }
  catch {}
}

/**
 * 目录参数检查
 *
 * @param checkPath
 * @param isOpenApi 是否为 OpenAPI 接口调用
 */
export function checkPathBoundary(checkPath: string, isOpenApi: boolean = false) {
  const resolvedPath = nodePath.resolve(checkPath)
  const normalizedRootDir = nodePath.resolve(APP_ROOT_DIR)
  if (!resolvedPath.startsWith(normalizedRootDir + nodePath.sep) && resolvedPath !== normalizedRootDir) {
    throw new Error('非法操作（路径超出允许范围）')
  }
  if (protectedPaths.includes(resolvedPath)) {
    throw new Error('非法操作（禁止访问受保护的文件）')
  }
  if (isOpenApi && openApiProtectedPaths.includes(resolvedPath)) {
    throw new Error('非法操作（禁止访问受保护的文件）')
  }
}

/**
 * 路径及操作合法性检查（文件必须存在）
 *
 * @param checkPath
 * @param isOpenApi 是否为 OpenAPI 接口调用
 */
export function checkPathAccess(checkPath: string, isOpenApi: boolean = false) {
  checkPathBoundary(checkPath, isOpenApi)
  const resolvedPath = nodePath.resolve(checkPath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('文件（夹）不存在')
  }
}

/**
 * 重命名
 *
 * @param filePath 当前路径
 * @param name 名称
 */
export function fileRename(filePath: string, name: string) {
  // 防止文件名包含路径遍历字符
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('非法操作（文件名不能包含路径分隔符或相对路径）')
  }
  const parentPath = nodePath.join(filePath, '../')
  const newPath = nodePath.join(parentPath, name)
  checkPathBoundary(newPath)
  try {
    fs.renameSync(filePath, newPath)
  }
  catch (err) {
    transferFsError(err)
  }
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
  let file: fs.Stats
  try {
    file = fs.statSync(filePath)
  }
  catch (err) {
    transferFsError(err)
  }
  if (file.isDirectory()) {
    clearDirectory(filePath)
    try {
      fs.rmdirSync(filePath)
    }
    catch (err) {
      transferFsError(err)
    }
    return
  }
  try {
    fs.unlinkSync(filePath)
  }
  catch (err) {
    transferFsError(err)
  }
}

/**
 * 文件（夹）移动
 *
 * @param filePath 当前路径
 * @param newPath 目标路径
 */
export function fileMove(filePath: string, newPath: string) {
  checkPathBoundary(newPath)
  const resolvedNewPath = nodePath.resolve(newPath)
  try {
    fs.renameSync(filePath, resolvedNewPath)
  }
  catch (err) {
    transferFsError(err)
  }
}

/**
 * 文件下载
 *
 * @param {string} fileOrFolderPath
 * @param {object} response
 */
export function fileDownload(fileOrFolderPath: string, response: Response) {
  fileOrFolderPath = nodePath.resolve(fileOrFolderPath)
  let file: fs.Stats
  try {
    file = fs.statSync(fileOrFolderPath)
  }
  catch (err) {
    transferFsError(err)
  }
  const fileName = nodePath.basename(fileOrFolderPath)
  if (file.isDirectory()) {
    const archive = new ZipArchive({})
    archive.on('error', (err) => {
      logger.error(`压缩归档出错: ${err?.message ?? err}`)
      if (!response.headersSent) {
        response.send(API_STATUS_CODE.fail(getFsErrorMessage(err)))
      }
      else {
        response.end()
      }
    })
    // logger.info(`开始生成压缩包：${fileName}.zip`)
    response.attachment(`${fileName}.zip`)
    archive.pipe(response)
    archive.directory(fileOrFolderPath, fileName, entry => excludeRegExp.test(entry.name) ? false : entry)
    archive.finalize().catch((err: Error) => {
      logger.error(`压缩归档完成失败: ${err?.message ?? err}`)
      if (!response.headersSent) {
        response.send(API_STATUS_CODE.fail(getFsErrorMessage(err)))
      }
      else {
        response.end()
      }
    })
  }
  else {
    response.attachment(fileName)
    fs.createReadStream(fileOrFolderPath)
      .on('error', (err) => {
        logger.error(`文件读取出错: ${err?.message ?? err}`)
        if (!response.headersSent) {
          response.send(API_STATUS_CODE.fail(getFsErrorMessage(err)))
        }
        else {
          response.end()
        }
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
  try {
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir)
    }
  }
  catch (err) {
    transferFsError(err)
  }
  const filePath = nodePath.join(fileDir, fileName)
  if (fs.existsSync(filePath)) {
    throw new Error(`${fileDir}目录下已经含有${fileName}该文件（夹）`)
  }
  try {
    if (type === APP_FILE_TYPES.FOLDER) {
      fs.mkdirSync(filePath)
    }
    else {
      fs.writeFileSync(filePath, content)
    }
  }
  catch (err) {
    transferFsError(err)
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
  let stat: fs.Stats
  try {
    stat = fs.statSync(filePath)
  }
  catch (err) {
    transferFsError(err)
  }
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
  return new Promise((resolve, reject) => execFile('bash', [APP_FILE_PATH.RESOLVE_SCRIPT, filePath], { encoding: 'utf8' }, (error, stdout) => {
    if (error) {
      logger.error('解析代码文件失败', filePath, '=>', error?.message || error)
      const enhancedError = new Error(`解析代码文件失败：${error?.message}`)
      enhancedError.cause = error
      reject(enhancedError)
    }
    else {
      try {
        const result = stdout.split('\n').filter((it) => it.trim().length > 0)
        resolve(JSON.parse(result[result.length - 1]))
      }
      catch (e: any) {
        logger.error('解析代码文件失败', filePath, '=>', e.message || e)
        const parseError = new Error(`解析代码文件失败：${e.message}`)
        parseError.cause = e
        reject(parseError)
      }
    }
  }))
}
