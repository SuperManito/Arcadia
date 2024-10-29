const db = require('../db').message
const { cleanProperties, validateObject } = require('../utils')

/**
 * 发送消息
 *
 * @async
 * @param {Object} data 消息数据
 * @param {string} data.title 消息标题
 * @param {string} data.content 消息内容
 * @param {string} data.source 消息来源
 * @param {string} data.category 消息类型
 * @returns {Promise<Object>} 创建的消息对象
 */
async function sendMessage(data) {
  validateObject(data, [
    ['title', [true, 'string']],
    ['content', [false, 'string']],
    ['source', [true, ['system', 'user']]],
    ['category', [false, ['info', 'error', 'warn']]],
  ])
  data = cleanProperties(data, ['title', 'content', 'source', 'category'])
  return await db.$create(data)
}

module.exports = {
  sendMessage,
}
