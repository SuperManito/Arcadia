// 告警引擎对外校验限额：条件正则与替换查找内容共用；替换条数按数组长度计算
export const REGEX_MAX_LENGTH = 512
export const REPLACE_REPLACEMENT_MAX_LENGTH = 256
export const REPLACE_MAX_COUNT = 20
export const REPLACE_SCOPES = ['both', 'title', 'content'] as const
