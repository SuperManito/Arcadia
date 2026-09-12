export interface TelegramConfig {
  botToken: string
  chatId: string
  /** 话题 ID */
  messageThreadId?: string
  /** 自定义 API 服务地址 */
  serverUrl?: string
  /** 静默发送 */
  sendSilently?: boolean
  /** 保护内容 */
  protectContent?: boolean
}
