import { Apprise } from './apprise'
import { Bark } from './bark'
import { DingDing } from './dingding'
import { Discord } from './discord'
import { Feishu } from './feishu'
import { GoogleChat } from './googlechat'
import { Gotify } from './gotify'
import { Kook } from './kook'
import { Pushplus } from './pushplus'
import { ServerChan } from './serverchan'
import { Telegram } from './telegram'
import { Webhook } from './webhook'
import { WeComApp } from './wecomapp'
import { WeComBot } from './wecombot'
import { WPush } from './wpush'
import { WxPusher } from './wxpusher'

/**
 * 全部渠道定义：新增渠道时在此登记一行（注意按首字母排序）
 */
export const Channels = {
  Apprise,
  Bark,
  DingDing,
  Discord,
  Feishu,
  GoogleChat,
  Gotify,
  Kook,
  Pushplus,
  ServerChan,
  Telegram,
  Webhook,
  WeComApp,
  WeComBot,
  WPush,
  WxPusher,
}
