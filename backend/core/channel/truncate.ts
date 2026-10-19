import { Buffer } from 'node:buffer'

/**
 * 按字符数截断，超长以省略号结尾且总长不超过 maxChars
 */
export function truncateChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }
  return `${text.slice(0, maxChars - 1)}…`
}

/**
 * 按 UTF-8 字节数截断（企业微信按字节限长），超长以省略号结尾且不拆开多字节字符
 */
export function truncateUtf8(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) {
    return text
  }
  const budget = maxBytes - Buffer.byteLength('…', 'utf8')
  let result = ''
  let used = 0
  for (const char of text) {
    const size = Buffer.byteLength(char, 'utf8')
    if (used + size > budget) {
      break
    }
    result += char
    used += size
  }
  return `${result}…`
}
