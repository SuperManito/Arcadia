export interface WebhookConfig {
  url: string
  /** 请求方法 */
  method?: 'POST' | 'GET' | 'PUT'
  /** 内容类型 */
  contentType?: 'json' | 'form'
  /** 自定义请求头 */
  headers?: string
  /** 请求体模板 */
  body?: string
}
