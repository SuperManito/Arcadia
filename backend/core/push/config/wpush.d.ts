export interface WPushConfig {
  apiKey: string
  channel: 'wechat' | 'sms' | 'mail' | 'feishu' | 'dingtalk' | 'wechat_work'
}
