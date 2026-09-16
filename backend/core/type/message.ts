export enum MessageCategory {
  SYSTEM = 'system',
  CRON = 'cron',
  USER = 'user',
}

// 枚举值列表，供多值校验与遍历使用
export const MESSAGE_CATEGORIES = Object.values(MessageCategory)

export enum MessageType {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success',
}

export const MESSAGE_TYPES = Object.values(MessageType)

export enum MessageScope {
  ALL = 'all',
  USER = 'user',
}

export interface MessageData {
  title: string
  content: string
  category?: MessageCategory
  type?: MessageType
  skipAlert?: boolean // 跳过告警评估，避免循环触发
}
