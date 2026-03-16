/**
 * Arcadia CLI 顶层命令枚举
 *
 * 用于统一管理底层 shell 脚本调用，避免命令字符串直接散落在业务代码中。
 */
export enum CLI_CMD {
  /** arcadia run <filePath> [options] — 运行代码文件 */
  RUN = 'arcadia run',
  /** arcadia stop <filePath> — 停止运行中的任务 */
  STOP = 'arcadia stop',
  /** arcadia envm edit <key> <value> — 设置环境变量 */
  ENVM_EDIT = 'arcadia envm edit',
}
