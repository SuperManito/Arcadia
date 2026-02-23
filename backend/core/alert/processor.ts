import type { alertConfigModel, alertConfigNotifyModel, alertConfigRuleModel, messageModel } from '../../db'
import { db } from '../../db'
import { sendNotification } from './notifiers'
import { logger } from '../../utils/logger'

/**
 * 处理消息通知逻辑
 * 当有新消息时，根据配置的告警规则进行匹配并发送通知
 *
 * @param msg 新消息对象
 */
export async function processMessageAlert(msg: messageModel) {
  // 使用findMany获取更准确的类型,自定义方法泛型include有问题
  const alertConfigs = await db.alertConfig.findMany({
    where: {
      mode: {
        not: 'disabled',
      },
    },
    include: {
      rules: true,
      notify: true,
    },
  })

  // 遍历每个告警配置
  for (const config of alertConfigs) {
    // 检查是否匹配该配置的所有规则
    if (await matchAlertRules(msg, config)) {
      // 如果匹配，则发送通知
      await sendAlertNotifications(msg, config)
    }
  }
}

/**
 * 检查消息是否匹配告警配置的所有规则
 *
 * @param msg 消息对象
 * @param config 告警配置
 * @returns 是否匹配
 */
async function matchAlertRules(
  msg: messageModel,
  config: alertConfigModel & { rules: alertConfigRuleModel[] },
): Promise<boolean> {
  // 如果没有规则，默认匹配
  if (!config.rules || config.rules.length === 0) {
    return true
  }

  // 所有规则都必须匹配
  for (const rule of config.rules) {
    if (!(await matchSingleRule(msg, rule))) {
      return false
    }
  }

  return true
}

/**
 * 检查消息是否匹配单个规则
 *
 * @param msg 消息对象
 * @param rule 规则对象
 * @returns 是否匹配
 */
async function matchSingleRule(msg: messageModel, rule: alertConfigRuleModel): Promise<boolean> {
  const { type, match, data } = rule

  // 根据不同类型的字段进行匹配
  let fieldValue = ''
  switch (type) {
    case 'title':
      fieldValue = msg.title
      break
    case 'content':
      fieldValue = msg.content
      break
    case 'category':
      fieldValue = msg.category
      break
    case 'tags':
      fieldValue = msg.tags
      break
    case 'source':
      fieldValue = msg.source
      break
    default:
      // 不支持的类型，默认不匹配
      return false
  }

  // 根据不同的匹配方式进行匹配
  switch (match) {
    case 'include':
      // 包含匹配
      return fieldValue.includes(data)

    case 'regex':
      // 正则匹配
      try {
        const regExp = new RegExp(data)
        return regExp.test(fieldValue)
      }
      catch (e) {
        logger.warn('Invalid regex pattern:', data, e)
        return false
      }

    case 'equal':
      // 完全相等
      return fieldValue === data

    case 'startsWith':
      // 开头匹配
      return fieldValue.startsWith(data)

    case 'endsWith':
      // 结尾匹配
      return fieldValue.endsWith(data)

    default:
      // 不支持的匹配方式，默认不匹配
      logger.warn('Unsupported match type:', match, 'for rule:', rule)
      return false
  }
}

/**
 * 发送告警通知
 *
 * @param msg 消息对象
 * @param config 告警配置
 */
async function sendAlertNotifications(
  msg: messageModel,
  config: alertConfigModel & { notify: alertConfigNotifyModel[] },
) {
  // 遍历所有通知配置
  for (const notification of config.notify) {
    try {
      // 使用动态注册的通知发送器发送通知
      await sendNotification(msg, notification)
    }
    catch (error) {
      logger.error('Failed to send notification:', error)
    }
  }
}
