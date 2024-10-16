const { parseFileNameDate, dateToFileName, getDateStr } = require('../utils')
const { API_STATUS_CODE } = require('../http/apiCode')
const { logger } = require('../logger')

const nodePath = require('path')
const fs = require('fs')
const os = require('os')
const archiver = require('archiver')
const { execSync } = require('child_process')
const { APP_ROOT_DIR, APP_DIR_TYPE, APP_FILE_TYPE, APP_FILE_NAME, APP_DIR_PATH, APP_FILE_PATH } = require('../type')

const canRunCodeFileExtList = ['js', 'mjs', 'cjs', 'py', 'ts', 'go', 'bun', 'lua', 'rb', 'pl', 'c', 'sh'] // 底层Shell已适配可执行代码文件类型的后缀
const excludeRegExp = /(user\.session)|(\.cache$)|(\.check$)|(\.git$)|(\.tmp$)|(__pycache__$)|(node_modules)/ // 全局过滤正则
const FILE_TYPES = {
  FOLDER: 'folder',
  FILE: 'file',
}

/**
 * 获取文件列表（仅一层，非递归）
 *
 * @param {string} dirPath - 目录路径
 * @returns {object}
 */
function getFileList(dirPath) {
  const files = fs.readdirSync(dirPath)
  const dirStats = fs.statSync(dirPath)
  const result = {
    // 构造文件夹数据
    path: dirPath,
    title: nodePath.basename(dirPath),
    type: FILE_TYPES.FOLDER,
    updated_at: dirStats.mtime,
    created_at: dirStats.birthtime,
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
          type: stats.isDirectory() ? FILE_TYPES.FOLDER : FILE_TYPES.FILE,
          updated_at: stats.mtime,
          created_at: stats.birthtime,
        }
      }),
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
function getFileTree(type, dirPath, params) {
  if (!fs.existsSync(dirPath)) {
    return []
  }
  let filesNameArr
  const parentDir = dirPath
  const filterPaths = [APP_FILE_PATH.DB, APP_FILE_PATH.AUTH] // 默认过滤的文件路径

  const options = (({ search = '', startTime = '', endTime = '', onlyDir = false, type } = {}) => {
    if (type === APP_DIR_TYPE.LOG) {
      startTime = startTime || ''
      endTime = endTime || ''
    }
    return { search, startTime, endTime, onlyDir }
  })(params)

  // 处理过滤参数
  const handleFilterParams = (parentDir, item, options) => {
    const { search = '', startTime = '', endTime = '', onlyDir } = options
    if (item.type === FILE_TYPES.FILE && onlyDir) {
      return false
    }
    const matchesSearch = search === '' || item.path.replace(parentDir, '').includes(search)
    const matchesStartTime = startTime === '' || fileNameTimeCompare(item.name, startTime) >= 0
    const matchesEndTime = endTime === '' || fileNameTimeCompare(item.name, endTime) <= 0
    return matchesSearch && matchesStartTime && matchesEndTime
  }

  // 递归读取目录
  const readDirs = (dirPath) => {
    const dirStats = fs.statSync(dirPath)
    const result = {
      path: dirPath,
      title: nodePath.basename(dirPath),
      type: FILE_TYPES.FOLDER,
      updated_at: dirStats.mtime,
      created_at: dirStats.birthtime,
    }
    const files = fs.readdirSync(dirPath)
    const children = sortFilesAndFolders(
      files
        .filter((item) => {
          return !excludeRegExp.test(item) && !filterPaths.includes(nodePath.join(dirPath, item))
        })
        .map((file) => {
          const subPath = nodePath.join(dirPath, file)
          const stats = fs.statSync(subPath)
          if (stats.isDirectory()) {
            return readDirs(subPath, file)
          }
          return {
            path: subPath,
            name: file,
            type: FILE_TYPES.FILE,
            updated_at: stats.mtime,
            created_at: stats.birthtime,
          }
        })
        .filter((item) => {
          return handleFilterParams(parentDir, item, options) && !filterPaths.includes(item.path)
        }),
      true,
    )
    if (type === APP_DIR_TYPE.LOG) {
      children.sort((a, b) => {
        // 只对文件进行排序
        if (a.type === FILE_TYPES.FOLDER && b.type === FILE_TYPES.FOLDER) {
          return 0
        }
        // 目录排在前面
        if (a.type === FILE_TYPES.FOLDER) {
          return -1
        }
        if (b.type === FILE_TYPES.FOLDER) {
          return 1
        }
        return b.updated_at - a.updated_at
      })
    }
    result.children = children
    return result
  }

  if (type === 'all' || type === APP_DIR_TYPE.ROOT) {
    filterPaths.push(APP_DIR_PATH.LOG)
    filesNameArr = readDirs(APP_ROOT_DIR).children
  } else {
    filesNameArr = readDirs(dirPath).children
  }

  return filesNameArr
}

/**
 * 文件目录排序（使文件夹排在数组中位置靠前）
 *
 * @param array 需要排序的数组
 * @param isAsc 是否升序
 * @returns {*[]}
 */
function sortFilesAndFolders(array = [], isAsc = true) {
  array.sort((a, b) => {
    const typeOrder = { [FILE_TYPES.FOLDER]: 0, [FILE_TYPES.FILE]: 1 }
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
function fileNameTimeCompare(fileName, time) {
  try {
    const fileTime = parseFileNameDate(fileName)
    const dateTime = new Date(time)
    return fileTime.getTime() - dateTime.getTime()
  } catch (e) {
    return 0
  }
}

/**
 * 去除文件内容中携带的命令行 ANSI 转义字符
 *
 * @param {string} content - 原始内容
 * @returns {string}
 */
function getNeatContent(content) {
  if (!content) return content
  const ansiRegex = ({ onlyFirst = false } = {}) => {
    const pattern = ['[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)', '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'].join('|')
    return new RegExp(pattern, onlyFirst ? undefined : 'g')
  }
  try {
    return content.replace(ansiRegex(), '')
  } catch (error) {
    return content
  }
}

/**
 * 检查主配置文件是否存在（初始化）
 */
function checkConfigFile() {
  if (!fs.existsSync(APP_FILE_PATH.CONFIG)) {
    console.error(APP_ROOT_DIR)
    console.error('服务启动失败，config.sh 文件不存在！')
    process.exit(1)
  }
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
 */
function bakConfigFile(file) {
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
function checkConfigSave(oldContent) {
  if (os.type() === 'Linux') {
    // 判断格式是否正确
    try {
      execSync(`bash ${APP_FILE_PATH.CONFIG} >${APP_DIR_PATH.LOG}/.check`, { encoding: 'utf8' })
    } catch (e) {
      fs.writeFileSync(APP_FILE_PATH.CONFIG, oldContent)
      let errorMsg,
        line
      try {
        errorMsg = /(?<=line\s[0-9]*:)([^"]+)/.exec(e.message)[0]
        line = /(?<=line\s)[0-9]*/.exec(e.message)[0]
      } catch (e) {}
      throw new Error(errorMsg && line ? `第 ${line} 行:${errorMsg}` : e.message)
    }
  }
}

/**
 * 保存配置文件
 *
 * @param {string} file
 * @param {string} content
 * @param {boolean} isBak - 是否备份 默认为true
 */
function saveNewConf(file, content, isBak = true) {
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
function getFile(fileKey) {
  let content
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
function getFileContentByName(filePath) {
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
function getJsonFile(fileKey) {
  return JSON.parse(getFile(fileKey))
}

/**
 * 保存文件内容
 *
 * @param filePath
 * @param content
 */
function saveFile(filePath, content) {
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
function rootPathCheck(checkPath) {
  if (!checkPath.startsWith(APP_ROOT_DIR)) {
    throw new Error('非法操作')
  }
}

/**
 * 路径以及操作合法性检查
 *
 * @param checkPath
 */
function pathCheck(checkPath) {
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
function fileRename(filePath, name) {
  const parentPath = nodePath.join(filePath, '../')
  fs.renameSync(filePath, nodePath.join(parentPath, name))
}

/**
 * 清空目录（删除指定目录下所有子文件或文件夹）
 *
 * @param folderPath 目录路径
 */
function clearDirectory(folderPath) {
  const files = fs.readdirSync(folderPath)
  files.forEach((file) => {
    const filePath = `${folderPath}/${file}`
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      clearDirectory(filePath)
      fs.rmdirSync(filePath)
    } else {
      fs.unlinkSync(filePath)
    }
  })
}

/**
 * 文件（夹）删除
 *
 * @param filePath 当前路径
 */
function fileDelete(filePath) {
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
function fileMove(filePath, newPath) {
  fs.renameSync(filePath, newPath)
}

/**
 * 文件下载
 *
 * @param {string} fileOrFolderPath
 * @param {object} response
 */
function fileDownload(fileOrFolderPath, response) {
  fileOrFolderPath = nodePath.resolve(fileOrFolderPath)
  const file = fs.statSync(fileOrFolderPath)
  const fileName = nodePath.basename(fileOrFolderPath)
  if (file.isDirectory()) {
    const archive = archiver('zip', {})
    archive.on('error', (err) => {
      response.send(API_STATUS_CODE.fail(err.message))
    })
    archive.on('end', () => {
      logger.info('Archive wrote %d bytes', archive.pointer())
    })
    response.attachment(`${fileName}.zip`)
    archive.pipe(response)
    archive.directory(fileOrFolderPath, fileName)
    archive.finalize()
  } else {
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
function fileCreate(fileDir, fileName, type, content = '') {
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir)
  }
  const filePath = nodePath.join(fileDir, fileName)
  if (fs.existsSync(filePath)) {
    throw new Error(`${fileDir}目录下已经含有${fileName}该文件（夹）`)
  }
  if (type === FILE_TYPES.FOLDER) {
    fs.mkdirSync(filePath)
  } else {
    fs.writeFileSync(filePath, content)
  }
  return filePath
}

/**
 * 查看文件详情
 *
 * @param {string} filePath - 路径
 */
function fileInfo(filePath) {
  const stat = fs.statSync(filePath)
  const size = !stat.isDirectory() ? stat.size : getDirectorySize(filePath)
  return {
    type: stat.isDirectory() ? FILE_TYPES.FOLDER : FILE_TYPES.FILE,
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
function formatFileSize(size) {
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
function getDirectorySize(dirPath) {
  let totalSize = 0
  // 读取目录内容
  const files = fs.readdirSync(dirPath)
  files.forEach((file) => {
    const filePath = nodePath.join(dirPath, file)
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      // 如果是目录，递归计算其大小
      totalSize += getDirectorySize(filePath)
    } else {
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

module.exports = {
  pathCheck,
  rootPathCheck,
  getFileTree,
  getFileList,
  getFile,
  getJsonFile,
  saveFile,
  fileRename,
  fileDelete,
  fileDownload,
  fileMove,
  fileCreate,
  fileInfo,
  saveNewConf,
  checkConfigFile,
  getNeatContent,
}
