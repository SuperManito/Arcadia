const fs = require('fs')
const filePath = require('../file/index').generateEnvFile

module.exports = {
  /**
   * 生成环境变量批量声明脚本
   *
   * @param {import("../db").envs_group[]} group
   * @param {import("../db").envs[]} items
   */
  generateEnvSh(group, items) {
    let header = '#!/bin/bash'
    header += '\n# This file is auto generated, please do not modify it manually'
    header += '\n# 本文件由系统自动生成，请勿手动修改\n'
    const lines = [header]
    ;(items || []).forEach((it) => {
      // if (it.description) {
      //   lines.push(`# ${it.description.replace(/\n/g, ' ')}`)
      // }
      lines.push(`export ${it.type}='${it.value.replace(/'/g, "'\"'\"'")}'`)
    })
    group.forEach((g) => {
      if (!g.enable) {
        return
      }
      // if (g.description) {
      //   lines.push(`# 变量组 ${g.description.replace(/\n/g, ' ')}`)
      // }
      const it = (g.envs || [])
        .filter((item) => item.enable || item.enable === undefined)
        .sort((a, b) => a.sort - b.sort)
      if (it.length > 0) {
        const separator = g.separator || ''
        it.forEach((item, i) => {
          // lines.push(`# ${i + 1} ${g.remark ? item.remark.replace(/\n/g, ' ') : g.description.replace(/\n/g, ' ')}`)
          if (i === 0) {
            lines.push(`export ${g.type}='${item.value.replace(/'/g, "'\"'\"'")}'`)
          } else {
            lines.push(`export ${g.type}=$\{${g.type}}'${separator}${item.value.replace(/'/g, "'\"'\"'")}'`)
          }
        })
        lines.push('')
      } else {
        lines.push(`export ${g.type}=''`)
      }
    })
    fs.writeFileSync(filePath, lines.join('\n'))
  },
}
