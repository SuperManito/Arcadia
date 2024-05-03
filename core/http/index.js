const axios = require('axios').default
const querystring = require('querystring')
const { API_STATUS_CODE } = require('./apiCode')
const { logger } = require('../logger')

const userAgentTools = {
  Android(userAgent) {
    return (/android/i.test(userAgent.toLowerCase()))
  },
  BlackBerry(userAgent) {
    return (/blackberry/i.test(userAgent.toLowerCase()))
  },
  iOS(userAgent) {
    return (/iphone|ipad|ipod/i.test(userAgent.toLowerCase()))
  },
  iPhone(userAgent) {
    return (/iphone/i.test(userAgent.toLowerCase()))
  },
  iPad(userAgent) {
    return (/ipad/i.test(userAgent.toLowerCase()))
  },
  iPod(userAgent) {
    return (/ipod/i.test(userAgent.toLowerCase()))
  },
  Opera(userAgent) {
    return (/opera mini/i.test(userAgent.toLowerCase()))
  },
  Windows(userAgent) {
    return (/iemobile/i.test(userAgent.toLowerCase()))
  },
  Pad(userAgent) {
    return (/pad|m2105k81ac/i.test(userAgent.toLowerCase()))
  },
  mobile(userAgent) {
    if (userAgentTools.Pad(userAgent)) {
      return false
    }
    return (userAgentTools.Android(userAgent) || userAgentTools.iPhone(userAgent) || userAgentTools.BlackBerry(userAgent))
  },
}

/**
 * @getClientIP
 * @desc 获取用户 ip 地址
 * @param {Object} req - 请求
 */
function getClientIP(req) {
  let ip = req.headers['x-forwarded-for']
        || req.ip
        || req.connection.remoteAddress
        || req.socket.remoteAddress
        || req.connection.socket.remoteAddress || ''
  if (ip.split(',').length > 0) {
    ip = ip.split(',')[0]
  }
  return ip.substr(ip.lastIndexOf(':') + 1, ip.length)
}

/**
 * ip转为地址
 * @param ip
 */
async function ip2Address(ip) {
  try {
    const { data } = await request({
      method: 'GET',
      url: 'http://ip.360.cn/IPShare/info',
      parmas: { ip },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.53',
        Referer: 'http://ip.360.cn/',
        Host: 'ip.360.cn',
      },
    })
    if (data) {
      let address = data.location === '* ' ? '未知' : data.location
      address = address.replace(/\t/g, ' ')
      return {
        ip,
        address,
      }
    }
  } catch (e) {
    logger.error('IP转换物理地址失败', e)
  }
  return {
    ip,
    address: '未知',
  }
}

/**
 * HTTP 请求
 *
 * @async
 * @param {object} config - 定制的配置对象，与 Axios 原生请求配置参数兼容
 * @returns {Promise<{
 *   success: boolean,
 *   status: number|null,
 *   data: object|string|null,
 *   headers: object|string|null,
 *   error: string|null,
 *   connected: boolean
 * }>} 返回一个 Promise 对象，包含以下属性：
 *   - success 请求结果
 *   - status 响应状态码
 *   - data 解析后的响应体
 *   - headers 响应标头
 *   - error 错误消息（请求失败后一定返回该参数）
 *   - connected 请求连通性
 */
async function request(config) {
  const returnData = {
    success: false,
    status: null,
    data: null,
    headers: null,
    error: null,
    connected: false,
  }
  try {
    if (!config || !config.url) {
      returnData.error = '缺少必要的请求参数'
      return returnData
    }
    Object.assign(axios.defaults, {
      headers: {
        common: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      maxRedirects: Infinity,
      timeout: 60000,
      transformResponse: [
        (data) => {
          try {
            return JSON.parse(data)
          } catch {}
          try {
            const jsonpRegex = /[\w$.]+\(\s*({[\s\S]*?})\s*\)\s*;?/
            if (jsonpRegex.test(data)) {
              const json = data.match(jsonpRegex)[1]
              return JSON.parse(json)
            }
          } catch {}
          return data
        },
      ],
    })
    if (config.body) {
      config.data = config.body
      delete config.body
    }
    for (const key of ['data', 'params']) {
      if (!config[key]) {
        delete config[key]
      }
    }
    config.method = (config.method || 'get').toLowerCase()
    if (config.data && typeof config.data === 'object' && (!config.headers || !config.headers['Content-Type'] || config.headers['Content-Type'].includes('application/x-www-form-urlencoded'))) {
      config.data = querystring.stringify(config.data)
    }
    await axios(config)
      .then((res) => {
        returnData.success = true
        returnData.status = res.status
        returnData.data = res.data
        returnData.headers = res.headers
        returnData.connected = true
      })
      .catch((res) => {
        let errorMessage = null
        if (res.response) {
          returnData.connected = true
          const statusCode = res.response?.status
          if (res.response.data) {
            returnData.data = res.response.data
          }
          const errorMessages = {
            400: '请求错误 [400 Bad Request]',
            401: '未授权 [401 Unauthorized]',
            403: '禁止访问 [403 Forbidden]',
            493: '禁止访问 [493 Forbidden]',
            404: '资源未找到 [404 Not Found]',
            408: '请求超时 [408 Request Timeout]',
            429: '请求过多 [429 Too Many Requests]',
            500: '服务器内部错误 [500 Internal Server Error]',
            502: '网关错误 [502 Bad Gateway]',
            503: '服务不可用 [503 Service Unavailable]',
          }
          errorMessage = errorMessages[statusCode] || `请求失败 [Response code ${statusCode}]`
        } else {
          if (res.request) {
            const errorMessages = {
              ECONNABORTED: '请求被中断',
              ECONNRESET: '连接被对方重置',
              ECONNREFUSED: '服务器拒绝连接',
              ETIMEDOUT: '网络请求超时',
              ENOTFOUND: '无法解析的域名或地址',
              EPROTO: '协议错误',
              EHOSTUNREACH: '无法到达服务器主机',
              ENETUNREACH: '无法到达网络',
              EADDRINUSE: '网络地址已被使用',
              EPIPE: '向已关闭的写入流进行写入',
              ERR_BAD_OPTION_VALUE: '无效或不支持的配置选项值',
              ERR_BAD_OPTION: '无效的配置选项',
              ERR_NETWORK: '网络错误',
              ERR_FR_TOO_MANY_REDIRECTS: '请求被重定向次数过多',
              ERR_DEPRECATED: '使用了已弃用的特性或方法',
              ERR_BAD_RESPONSE: '服务器响应无效或无法解析',
              ERR_BAD_REQUEST: '请求无效或缺少必需参数',
              ERR_CANCELED: '请求被用户取消',
              ERR_NOT_SUPPORT: '当前环境不支持此特性或方法',
              ERR_INVALID_URL: '请求的 URL 无效',
              ERR_TLS_CERT_ALTNAME_INVALID: 'TLS 证书的主机名无效',
              ERR_TLS_CERT_REJECTED: 'TLS 证书被拒绝',
              ERR_HTTP2_STREAM_CANCEL: 'HTTP2 流被取消',
              ERR_HTTP2_SESSION_ERROR: 'HTTP2 会话出错',
              ERR_QUICSESSION_VERSION_NEGOTIATION: 'QUIC 会话版本协商失败',
              EAI_AGAIN: 'DNS 查找超时',
            }
            errorMessage = `${errorMessages[res.code] ?? '未知网络错误'} [${res.code}]`
          } else {
            errorMessage = res.message || '未知错误状态'
          }
        }
        returnData.error = errorMessage
        returnData.status = res.response?.status || null
      })
  } catch (error) {
    returnData.error = error.message || error
  }
  return returnData
}

module.exports = {
  API_STATUS_CODE,
  userAgentTools,
  getClientIP,
  ip2Address,
  request,
}
