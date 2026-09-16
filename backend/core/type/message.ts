export enum MessageCategory {
  System = 'system',
  Cron = 'cron',
  User = 'user',
}

// 枚举值列表，供多值校验与遍历使用
export const MESSAGE_CATEGORIES = Object.values(MessageCategory)

export enum MessageType {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Success = 'success',
}

export const MESSAGE_TYPES = Object.values(MessageType)

export enum MessageScope {
  All = 'all',
  User = 'user',
}

export interface MessageData {
  title: string
  content: string
  category?: MessageCategory
  type?: MessageType
  skipAlert?: boolean // 跳过告警评估，避免循环触发
}
