import path from 'node:path'

export const APP_ROOT_DIR = path.resolve(__dirname, '../../../') // 根目录 /arcadia
export const APP_SOURCE_DIR = path.join(__dirname, '../../') // 源码目录 /arcadia/src
export const APP_PUBLIC_DIR = path.join(APP_SOURCE_DIR, 'public') // 静态文件目录 /arcadia/src/public

export enum APP_FILE_TYPE {
  CONFIG = 'config',
  AUTH = 'auth',
}

export enum APP_FILE_NAME {
  DB = 'config.db',
  CONFIG = 'config.sh',
  ENV = 'env.sh',
  AUTH = 'auth.json',
  EXTRA_SERVER = 'extra_server.js',
}

export enum APP_DIR_TYPE {
  ALL = 'all',
  ROOT = 'arcadia',
  SRC = 'src',
  CONFIG = 'config',
  SAMPLE = 'sample',
  SCRIPTS = 'scripts',
  SHELL = 'shell',
  LOG = 'log',
  REPO = 'repo',
  RAW = 'raw',
  CONFIG_BAK = 'bak',
}

export const APP_DIR_PATH = {
  ROOT: APP_ROOT_DIR,
  SRC: path.join(APP_ROOT_DIR, APP_DIR_TYPE.SRC), // 源码文件目录
  CONFIG: path.join(APP_ROOT_DIR, APP_DIR_TYPE.CONFIG), // 配置文件目录（用户）
  SAMPLE: path.join(APP_SOURCE_DIR, APP_DIR_TYPE.SAMPLE), // 配置文件模板目录
  SCRIPTS: path.join(APP_ROOT_DIR, APP_DIR_TYPE.SCRIPTS), // 代码文件目录（用户）
  SHELL: path.join(APP_SOURCE_DIR, APP_DIR_TYPE.SHELL), // 底层脚本目录
  LOG: path.join(APP_ROOT_DIR, APP_DIR_TYPE.LOG), // 日志目录（用户）
  REPO: path.join(APP_ROOT_DIR, APP_DIR_TYPE.REPO), // 代码仓库目录（用户）
  RAW: path.join(APP_ROOT_DIR, APP_DIR_TYPE.RAW), // 远程代码文件目录（用户）
  CONFIG_BAK: path.join(APP_ROOT_DIR, APP_DIR_TYPE.CONFIG, APP_DIR_TYPE.CONFIG_BAK), // 配置文件备份目录
}

export const APP_FILE_PATH = {
  DB: path.join(APP_DIR_PATH.CONFIG, APP_FILE_NAME.DB), // config.db 文件路径
  CONFIG: path.join(APP_DIR_PATH.CONFIG, APP_FILE_NAME.CONFIG), // config.sh 文件路径
  ENV: path.join(APP_DIR_PATH.CONFIG, APP_FILE_NAME.ENV), // env.sh 文件路径
  AUTH: path.join(APP_DIR_PATH.CONFIG, APP_FILE_NAME.AUTH), // auth.json 文件路径
  EXTRA_SERVER: path.join(APP_DIR_PATH.CONFIG, APP_FILE_NAME.EXTRA_SERVER), // extra_server.js 文件路径
  RESOLVE_SCRIPT: path.join(APP_DIR_PATH.SHELL, 'utils/resolve.sh'), // resolve.sh 文件路径
}

export enum APP_FILE_TYPES {
  FOLDER = 'folder',
  FILE = 'file',
}
