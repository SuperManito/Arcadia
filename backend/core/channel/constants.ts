// 推送载荷模板占位符：消息模板、通知尾、Webhook 请求体共用，占位符名称是对用户展示的功能契约
export const TEMPLATE_TITLE_PLACEHOLDER = '{{title}}'
export const TEMPLATE_CONTENT_PLACEHOLDER = '{{content}}'
export const TEMPLATE_TIME_PLACEHOLDER = '{{time}}'

// 测试发送默认文案；前端弹窗未自定义标题/内容或传空时回退
export const TEST_NOTIFY_TITLE = '测试通知'
export const TEST_NOTIFY_CONTENT = '这是一条来自 Arcadia 平台的测试通知，收到即表示渠道配置有效。'
