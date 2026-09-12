import type { ValidateObjectParamType } from '../../utils'
import type { AppriseConfig } from './config/apprise'
import type { BarkConfig } from './config/bark'
import type { DingDingConfig } from './config/dingding'
import type { DiscordConfig } from './config/discord'
import type { FeishuConfig } from './config/feishu'
import type { GoogleChatConfig } from './config/googlechat'
import type { GotifyConfig } from './config/gotify'
import type { KookConfig } from './config/kook'
import type { PushplusConfig } from './config/pushplus'
import type { ServerChanConfig } from './config/serverchan'
import type { TelegramConfig } from './config/telegram'
import type { WebhookConfig } from './config/webhook'
import type { WeComAppConfig } from './config/wecomapp'
import type { WeComBotConfig } from './config/wecombot'
import type { WPushConfig } from './config/wpush'
import type { WxPusherConfig } from './config/wxpusher'

export type Pusher = (config: Record<string, any>, payload: PushPayload) => Promise<void>

// 渠道类型唯一键，按首字母排列
export const CHANNEL_TYPES = [
  'apprise',
  'bark',
  'dingding',
  'discord',
  'feishu',
  'googlechat',
  'gotify',
  'kook',
  'pushplus',
  'serverchan',
  'telegram',
  'webhook',
  'wecomapp',
  'wecombot',
  'wpush',
  'wxpusher',
] as const
export type ChannelType = typeof CHANNEL_TYPES[number]

export interface PushPayload {
  title: string
  content: string
}

export type ChannelConfig
  = | AppriseConfig
    | WxPusherConfig
    | BarkConfig
    | DingDingConfig
    | FeishuConfig
    | ServerChanConfig
    | PushplusConfig
    | WPushConfig
    | KookConfig
    | DiscordConfig
    | TelegramConfig
    | GoogleChatConfig
    | GotifyConfig
    | WeComBotConfig
    | WeComAppConfig
    | WebhookConfig

// 各渠道 config 字段白名单，未声明字段丢弃；字段值的格式/范围校验交前端，后端只做字段筛查
export const CHANNEL_CONFIG_RULES: Record<ChannelType, ReadonlyArray<ValidateObjectParamType>> = {
  apprise: [
    ['url', [true, 'string']],
  ],
  wxpusher: [
    ['appToken', [true, 'string']],
    ['uids', [false, 'string[]']],
    ['topicIds', [false, 'object']],
    ['url', [false, 'string']],
  ],
  bark: [
    ['deviceKey', [true, 'string']],
    ['server', [false, 'string']],
    ['url', [false, 'string']],
    ['group', [false, 'string']],
    ['sound', [false, 'string']],
    ['icon', [false, 'string']],
    ['level', [false, ['active', 'timeSensitive', 'passive', 'critical']]],
    ['call', [false, 'boolean']],
    ['badge', [false, 'number']],
  ],
  dingding: [
    ['webhookUrl', [true, 'string']],
    ['secret', [false, 'string']],
    ['mentionType', [false, ['none', 'all', 'mobiles', 'users']]],
    ['mobiles', [false, 'string[]']],
    ['users', [false, 'string[]']],
  ],
  feishu: [
    ['webhookUrl', [true, 'string']],
  ],
  serverchan: [
    ['sendKey', [true, 'string']],
  ],
  pushplus: [
    ['token', [true, 'string']],
  ],
  wpush: [
    ['apiKey', [true, 'string']],
    ['channel', [true, ['wechat', 'sms', 'mail', 'feishu', 'dingtalk', 'wechat_work']]],
  ],
  kook: [
    ['botToken', [true, 'string']],
    ['guildId', [true, 'string']],
  ],
  discord: [
    ['webhookUrl', [true, 'string']],
    ['username', [false, 'string']],
    ['channelType', [false, ['channel', 'createNewForumPost', 'postToThread']]],
    ['postName', [false, 'string']],
    ['threadId', [false, 'string']],
    ['suppressNotifications', [false, 'boolean']],
  ],
  telegram: [
    ['botToken', [true, 'string']],
    ['chatId', [true, 'string']],
    ['messageThreadId', [false, 'string']],
    ['serverUrl', [false, 'string']],
    ['sendSilently', [false, 'boolean']],
    ['protectContent', [false, 'boolean']],
  ],
  googlechat: [
    ['webhookUrl', [true, 'string']],
    ['maxRetries', [false, 'number']],
  ],
  gotify: [
    ['serverUrl', [true, 'string']],
    ['token', [true, 'string']],
    ['priority', [false, 'number']],
  ],
  wecombot: [
    ['webhookUrl', [true, 'string']],
  ],
  wecomapp: [
    ['corpId', [true, 'string']],
    ['corpSecret', [true, 'string']],
    ['agentId', [true, 'number']],
    ['toUser', [true, 'string[]']],
  ],
  webhook: [
    ['url', [true, 'string']],
    ['method', [false, ['POST', 'GET', 'PUT']]],
    ['contentType', [false, ['json', 'form']]],
    ['headers', [false, 'string']],
    ['body', [false, 'string']],
  ],
}
