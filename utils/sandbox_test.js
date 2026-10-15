#!/usr/bin/env node

/**
 * 沙箱功能测试模块
 *
 * 用法（Linux 环境）：
 *   node sandbox_test.js [用例名过滤]
 *
 * 模块只调用 arcadia run --sandbox 命令，按固定用例清单验证业务预期：
 *   - 沙箱行为表现：配置项组合下沙箱应正常启动并输出成功标记
 *   - 选项逻辑：格式校验、高层互斥、opts 透传冲突与重复应报对应错误
 * 用例分为两组：沙箱行为测试在上，选项逻辑测试在下。
 *
 * CLI 解析顺序：SANDBOX_TEST_ARCADIA 环境变量 > PATH 中的 arcadia。
 * 运行目标写入项目 ScriptsDir（容器中为 /arcadia/scripts），可用 SANDBOX_TEST_SCRIPTS_DIR 覆盖，跑完自动清理。
 * 逐项串行执行：先打印当前用例与 sandbox 选项，再输出该项结果，最后用表格汇总整体结果。
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MARKER = 'SANDBOX_TEST_OK'
const WRITE_TEST_DIR = '/tmp/sandbox-test-out'
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001B\[[0-9;]*m/g

const GREEN = '\u001B[32m'
const RED = '\u001B[31m'
const RESET = '\u001B[0m'

function stripAnsi(text) {
  return text.replace(ANSI_PATTERN, '')
}

function resolveCli() {
  if (process.env.SANDBOX_TEST_ARCADIA) {
    const parts = process.env.SANDBOX_TEST_ARCADIA.trim().split(/\s+/)
    return { cmd: parts[0], args: parts.slice(1) }
  }
  return { cmd: 'arcadia', args: [] }
}

function resolveScriptsDir() {
  if (process.env.SANDBOX_TEST_SCRIPTS_DIR) {
    return process.env.SANDBOX_TEST_SCRIPTS_DIR
  }
  if (process.env.ARCADIA_DIR) {
    return path.join(process.env.ARCADIA_DIR, 'scripts')
  }
  return path.join(path.resolve(__dirname, '..', '..', '..'), 'scripts')
}

// 沙箱行为表现：配置项组合下沙箱应正常启动并输出成功标记
const BEHAVIOR_CASES = [
  { name: '基础沙箱', args: ['--sandbox'] },
  { name: '网络黑名单 deny-local', args: ['--sandbox', '--sandbox-net-deny-local'] },
  { name: '网络白名单 net-allow', args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1:443'] },
  { name: '完全断网 deny-all', args: ['--sandbox', '--sandbox-net-deny-all'] },
  { name: '端口绑定 allow-bind', args: ['--sandbox', '--sandbox-net-allow-bind', '18080'] },
  { name: '端口绑定 allow-bind-all', args: ['--sandbox', '--sandbox-net-allow-bind-all'] },
  { name: 'HTTP 白名单', args: ['--sandbox', '--sandbox-http-allow', 'GET example.com/*'] },
  { name: 'HTTP 黑名单', args: ['--sandbox', '--sandbox-http-deny', '* */admin/*'] },
  { name: '网络黑名单 net-deny', args: ['--sandbox', '--sandbox-net-deny', '198.51.100.0/24'] },
  { name: '网络白名单任意端口', args: ['--sandbox', '--sandbox-net-allow', '*:*'] },
  { name: '网络白名单 UDP 任意目标', args: ['--sandbox', '--sandbox-net-allow', 'udp://*:*'] },
  { name: '网络白名单多端口', args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1:80,443'] },
  { name: '网络白名单 IPv6 网段', args: ['--sandbox', '--sandbox-net-allow', '[2606:4700::/32]:443'] },
  { name: '网络白名单 ICMP', args: ['--sandbox', '--sandbox-net-allow', 'icmp://*'] },
  { name: '网络黑名单 IPv6', args: ['--sandbox', '--sandbox-net-deny', '::1/128'] },
  { name: '网络黑名单协议前缀', args: ['--sandbox', '--sandbox-net-deny', 'udp://192.168.0.0/16'] },
  { name: '网络黑名单与 deny-local 叠加', args: ['--sandbox', '--sandbox-net-deny', '198.51.100.0/24', '--sandbox-net-deny-local'] },
  { name: '网络白名单与黑名单组合', args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1:443', '--sandbox-net-deny', '10.0.0.0/8'] },
  { name: '网络白名单与 deny-local 叠加', args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1:443', '--sandbox-net-deny-local'] },
  { name: 'opts 透传白名单与高层 deny-local 组合', args: ['--sandbox', '--sandbox-net-deny-local', '--sandbox-opts', '--net-allow 1.1.1.1:443'] },
  {
    name: 'opts 透传白名单与黑名单组合',
    args: ['--sandbox', '--sandbox-opts', '--net-allow 1.1.1.1:443 --net-deny 10.0.0.0/8'],
  },
  { name: 'opts 透传黑名单与高层白名单组合', args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1:443', '--sandbox-opts', '--net-deny 10.0.0.0/8'] },
  {
    name: '网络白名单与 HTTP 白名单组合',
    args: ['--sandbox', '--sandbox-net-allow', 'tcp://example.com:443', '--sandbox-http-allow', 'GET example.com/*'],
  },
  { name: '端口绑定多端口区间', args: ['--sandbox', '--sandbox-net-allow-bind', '18080,19000-19005'] },
  { name: '内存限制', args: ['--sandbox', '--sandbox-max-memory', '8G'] },
  { name: '环境变量注入', args: ['--sandbox', '--sandbox-env', 'SANDBOX_TEST_VAR=hello'] },
  { name: '环境变量清空与注入', args: ['--sandbox', '--sandbox-clear-env', '--sandbox-env', 'SANDBOX_TEST_VAR=hello'] },
  { name: '环境变量白名单', args: ['--sandbox', '--sandbox-allow-env-whitelist', 'PATH'] },
  { name: '环境变量黑名单', args: ['--sandbox', '--sandbox-allow-env-blacklist', 'HOME,USER'] },
  { name: '追加只读路径', args: ['--sandbox', '--sandbox-allow-read', '/var/log'] },
  { name: '追加读写路径', args: ['--sandbox', '--sandbox-allow-write', '/tmp/sandbox-test-out'] },
  {
    name: 'opts 透传 CA 注入',
    args: ['--sandbox', '--sandbox-opts', '--http-allow \'GET example.com/*\' --http-inject-ca /etc/ssl/certs/ca-certificates.crt'],
  },
  { name: 'opts 透传 clean-env', args: ['--sandbox', '--sandbox-opts', '--clean-env'] },
  { name: 'opts 透传内存限制', args: ['--sandbox', '--sandbox-opts', '-m 8G'] },
  { name: 'opts 透传网络白名单', args: ['--sandbox', '--sandbox-opts', '--net-allow 1.1.1.1:443'] },
  { name: 'opts 透传 HTTP 黑名单', args: ['--sandbox', '--sandbox-opts', '--http-deny \'GET example.com/*\''] },
  { name: 'opts 透传端口绑定', args: ['--sandbox', '--sandbox-opts', '--net-allow-bind 18080'] },
]

// 选项逻辑：格式校验、高层互斥、opts 透传冲突与重复
const OPTION_LOGIC_CASES = [
  // 参数格式校验
  { name: '网络白名单含空格应报错', args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1 443'], expectError: '不能包含空格' },
  { name: '网络黑名单含空格应报错', args: ['--sandbox', '--sandbox-net-deny', '1.1.1.1 443'], expectError: '不能包含空格' },
  { name: 'HTTP 白名单格式错误应报错', args: ['--sandbox', '--sandbox-http-allow', 'GET example.com/foo bar'], expectError: '格式有误' },
  { name: 'HTTP 黑名单格式错误应报错', args: ['--sandbox', '--sandbox-http-deny', 'GET example.com/foo bar'], expectError: '格式有误' },
  { name: '端口绑定格式错误应报错', args: ['--sandbox', '--sandbox-net-allow-bind', '80a'], expectError: '格式有误' },
  { name: '内存限制格式错误应报错', args: ['--sandbox', '--sandbox-max-memory', 'abc'], expectError: '格式有误' },
  { name: '环境变量格式错误应报错', args: ['--sandbox', '--sandbox-env', '123=hello'], expectError: '格式有误' },
  { name: '环境变量白名单格式错误应报错', args: ['--sandbox', '--sandbox-allow-env-whitelist', 'PATH HOME'], expectError: '格式有误' },

  // 高层选项互斥：由 CLI 基础拦截输出
  {
    name: '高层 deny-all 与 net-allow 互斥应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-net-allow', '1.1.1.1:443'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 deny-all 与 net-deny 互斥应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-net-deny', '10.0.0.0/8'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 deny-all 与 deny-local 互斥应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-net-deny-local'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 allow-bind-all 与 allow-bind 互斥应报错',
    args: ['--sandbox', '--sandbox-net-allow-bind-all', '--sandbox-net-allow-bind', '18080'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 HTTP allow 与 deny 互斥应报错',
    args: ['--sandbox', '--sandbox-http-allow', 'GET example.com/*', '--sandbox-http-deny', '* */admin/*'],
    expectError: '不可同时使用',
  },
  {
    name: '完全断网与 HTTP 白名单互斥应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-http-allow', 'GET example.com/*'],
    expectError: '不可同时使用',
  },
  {
    name: '完全断网与 HTTP 黑名单互斥应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-http-deny', '* */admin/*'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 clear-env 与 whitelist 互斥应报错',
    args: ['--sandbox', '--sandbox-clear-env', '--sandbox-allow-env-whitelist', 'PATH'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 blacklist 与 clear-env 互斥应报错',
    args: ['--sandbox', '--sandbox-allow-env-blacklist', 'HOME,USER', '--sandbox-clear-env'],
    expectError: '不可同时使用',
  },
  {
    name: '高层 blacklist 与 whitelist 互斥应报错',
    args: ['--sandbox', '--sandbox-allow-env-blacklist', 'HOME,USER', '--sandbox-allow-env-whitelist', 'PATH'],
    expectError: '不可同时使用',
  },

  // opts 透传冲突 / 与高层重复：统一报 opts 用法错误
  {
    name: 'opts HTTP 冲突应报错',
    args: ['--sandbox', '--sandbox-opts', '--http-allow \'GET httpbin.org/*\' --http-deny \'GET example.com/*\''],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层 net-allow 重复应报错',
    args: ['--sandbox', '--sandbox-net-allow', '1.1.1.1:443', '--sandbox-opts', '--net-allow 1.1.1.1:443'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层 net-deny 重复应报错',
    args: ['--sandbox', '--sandbox-net-deny', '10.0.0.0/8', '--sandbox-opts', '--net-deny 10.0.0.0/8'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层 allow-bind 重复应报错',
    args: ['--sandbox', '--sandbox-net-allow-bind', '18080', '--sandbox-opts', '--net-allow-bind 18080'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层 HTTP allow 重复应报错',
    args: ['--sandbox', '--sandbox-http-allow', 'GET example.com/*', '--sandbox-opts', '--http-allow \'GET example.com/*\''],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层 HTTP deny 重复应报错',
    args: ['--sandbox', '--sandbox-http-deny', '* */admin/*', '--sandbox-opts', '--http-deny \'* */admin/*\''],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层内存限制重复应报错',
    args: ['--sandbox', '--sandbox-max-memory', '8G', '--sandbox-opts', '-m 8G'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 与高层 clear-env 重复应报错',
    args: ['--sandbox', '--sandbox-clear-env', '--sandbox-opts', '--clean-env'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts clean-env 与高层 whitelist 重复应报错',
    args: ['--sandbox', '--sandbox-allow-env-whitelist', 'PATH', '--sandbox-opts', '--clean-env'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts clean-env 与高层 blacklist 重复应报错',
    args: ['--sandbox', '--sandbox-allow-env-blacklist', 'HOME,USER', '--sandbox-opts', '--clean-env'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 网络白名单与高层 deny-all 冲突应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-opts', '--net-allow 1.1.1.1:443'],
    expectError: '--sandbox-opts 用法错误',
  },
  {
    name: 'opts 透传 HTTP 与完全断网互斥应报错',
    args: ['--sandbox', '--sandbox-net-deny-all', '--sandbox-opts', '--http-allow \'GET example.com/*\''],
    expectError: '--sandbox-opts 用法错误',
  },
]

const CASES = [
  ...BEHAVIOR_CASES.map((testCase) => ({ ...testCase, group: '沙箱行为测试' })),
  ...OPTION_LOGIC_CASES.map((testCase) => ({ ...testCase, group: '选项逻辑测试' })),
]

function makeTarget(scriptsDir) {
  fs.mkdirSync(scriptsDir, { recursive: true })
  fs.mkdirSync(WRITE_TEST_DIR, { recursive: true })
  const dir = fs.mkdtempSync(path.join(scriptsDir, '.sandbox-test-'))
  const target = path.join(dir, 'sandbox_target.js')
  fs.writeFileSync(target, `console.log('${MARKER}');\n`, 'utf8')
  return { dir, target }
}

function runArcadium(cli, target, args) {
  return spawnSync(cli.cmd, [...cli.args, 'run', target, '--no-log', ...args], {
    encoding: 'utf8',
    timeout: 180000,
  })
}

function firstLine(text, max = 300) {
  const line
    = text
      .trim()
      .split('\n')
      .find((item) => item.trim()) ?? ''
  const trimmed = line.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed
}

function displayWidth(text) {
  let width = 0
  for (const char of stripAnsi(text)) {
    width += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(char) ? 2 : 1
  }
  return width
}

function padCell(text, width) {
  return `${text}${' '.repeat(Math.max(0, width - displayWidth(text)))}`
}

function shellQuote(value) {
  if (value === '')
    return '\'\''
  if (/^[\w./:=+@%,-]+$/.test(value))
    return value
  return `"${value.replace(/(["\\$`])/g, '\\$1')}"`
}

function printTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(displayWidth(header), ...rows.map((row) => displayWidth(String(row[index] ?? '')))),
  )
  const border = (left, fill, intersection, right) =>
    `${left}${widths.map((width) => fill.repeat(width + 2)).join(intersection)}${right}`
  const renderRow = (cells) =>
    `│ ${cells.map((cell, index) => padCell(String(cell ?? ''), widths[index])).join(' │ ')} │`

  console.log(border('┌', '─', '┬', '┐'))
  console.log(renderRow(headers))
  console.log(border('├', '─', '┼', '┤'))
  for (const row of rows) console.log(renderRow(row))
  console.log(border('└', '─', '┴', '┘'))
}

function runCase(testCase, target, cli) {
  const result = runArcadium(cli, target, testCase.args)
  const output = stripAnsi(`${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`)
  const failures = []

  if (testCase.expectError) {
    if (result.status === 0)
      failures.push('命令未按预期报错')
    if (!output.includes(testCase.expectError))
      failures.push(`未输出预期错误：${testCase.expectError}`)
  }
  else {
    if (result.status !== 0)
      failures.push(`命令退出码 ${result.status ?? 'spawn 失败'}`)
    if (!output.includes(MARKER))
      failures.push(`未输出成功标记 ${MARKER}`)
  }
  if (failures.length > 0 && output.trim()) {
    failures.push(`实际输出：${firstLine(output)}`)
  }

  return {
    ok: failures.length === 0,
    failures,
    testCase,
  }
}

function runAll(filter = '') {
  const targets = CASES.filter((testCase) => !filter || testCase.name.includes(filter) || testCase.group.includes(filter))
  if (targets.length === 0) {
    console.error(`未找到匹配 "${filter}" 的测试用例`)
    process.exitCode = 1
    return
  }

  const cli = resolveCli()
  const { dir, target } = makeTarget(resolveScriptsDir())
  try {
    console.log(`沙箱测试：共 ${targets.length} 个用例`)
    console.log()

    const results = []
    let currentGroup = ''
    for (let index = 0; index < targets.length; index += 1) {
      const testCase = targets[index]
      if (testCase.group !== currentGroup) {
        currentGroup = testCase.group
        console.log(`## ${currentGroup}`)
        console.log()
      }
      console.log(`[${index + 1}/${targets.length}] ${testCase.name}`)
      console.log(`  $ ${testCase.args.map(shellQuote).join(' ')}`)
      const result = runCase(testCase, target, cli)
      results.push(result)
      if (result.ok) {
        console.log(`  结果：${GREEN}PASS${RESET}`)
      }
      else {
        console.log(`  结果：${RED}FAIL${RESET}`)
        for (const failure of result.failures)
          console.log(`       - ${failure}`)
      }
      console.log()
    }

    const failed = results.filter((result) => !result.ok)
    const passed = results.length - failed.length
    printTable(
      ['#', '结果', '用例', '失败原因'],
      results.map((result, index) => [
        String(index + 1),
        result.ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`,
        result.testCase.name,
        result.ok ? '' : (result.failures[0] ?? ''),
      ]),
    )

    console.log()
    console.log(`通过：${passed}/${results.length}（PASS ${passed} / FAIL ${failed.length}）`)
    process.exitCode = passed === results.length ? 0 : 1
  }
  finally {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.rmSync(WRITE_TEST_DIR, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runAll(process.argv[2])
}

export { CASES, runAll }
