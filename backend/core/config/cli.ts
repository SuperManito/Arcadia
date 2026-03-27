import fs from 'node:fs'
import { APP_FILE_PATH } from '../type'
import { ConfigKeyCli, ConfigModule, DEFAULT_CONFIG_VALUES } from '../type/config'
import db from '../../db'

const CLI_CONFIG_PREFIX = 'CLI_CONFIG_'

/**
 * 生成 CLI 配置批量声明脚本（不带 export 关键字）
 * 输出文件：.arcadia_cli_config.sh
 */
export async function generateCliConfigSh(): Promise<void> {
  const configs = await db.config.findMany({
    where: { module: ConfigModule.CLI },
  })

  const configMap: Record<string, string> = {}
  for (const item of configs) {
    configMap[item.key] = item.value
  }

  let header = '#!/bin/bash'
  header += '\n# This file is auto generated, please do not modify it manually'
  header += '\n# 本文件由系统自动生成，请勿手动修改\n'

  const lines = [header]

  for (const key of Object.values(ConfigKeyCli)) {
    const value = configMap[key] ?? DEFAULT_CONFIG_VALUES[ConfigModule.CLI][key]
    const varName = `${CLI_CONFIG_PREFIX}${key}`
    const escapedValue = value.split('\'').join('\'"\'"\'')
    lines.push(`${varName}='${escapedValue}'`)
  }

  fs.writeFileSync(APP_FILE_PATH.CLI_CONFIG, `${lines.join('\n')}\n`)
}
