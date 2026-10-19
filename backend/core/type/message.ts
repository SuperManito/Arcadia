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

export const MESSAGE_TITLE_MAX_LENGTH = 200
export const MESSAGE_CONTENT_MAX_LENGTH = 20000
// 搜索限长，避免超长关键字放大全表扫描
export const MESSAGE_SEARCH_MAX_LENGTH = 100
// 批量操作 id 数量上限，防止超大 in 查询
export const MESSAGE_BATCH_ID_MAX_COUNT = 1000

export interface MessageData {
  title: string
  content: string
  category?: MessageCategory
  type?: MessageType
  skipAlert?: boolean // 跳过告警评估，避免循环触发
}
