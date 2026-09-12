export interface DingDingConfig {
  webhookUrl: string
  /** 加签密钥 */
  secret?: string
  /** @ 方式 */
  mentionType?: 'none' | 'all' | 'mobiles' | 'users'
  /** @ 手机号 */
  mobiles?: string[]
  /** @ 用户 ID */
  users?: string[]
}
