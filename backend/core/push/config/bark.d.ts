export interface BarkConfig {
  deviceKey: string
  server?: string
  url?: string
  /** 通知分组 */
  group?: string
  /** 提示音名称 */
  sound?: string
  /** 通知图标 URL */
  icon?: string
  /** 推送级别 */
  level?: 'active' | 'timeSensitive' | 'passive' | 'critical'
  /** 重复响铃 */
  call?: boolean
  /** 角标数字 */
  badge?: number
}
