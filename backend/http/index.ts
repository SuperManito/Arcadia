import type { Request } from 'express'
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import querystring from 'node:querystring'
import { logger } from '../logger'
export { default as API_STATUS_CODE } from './apiCode'

interface RequestConfig extends AxiosRequestConfig {
  body?: object | string
  parmas?: object | string
}

export const userAgentTools = {
  Android(userAgent: string) {
    return (/android/i.test(userAgent.toLowerCase()))
  },
  BlackBerry(userAgent: string) {
    return (/blackberry/i.test(userAgent.toLowerCase()))
  },
  iOS(userAgent: string) {
    return (/iphone|ipad|ipod/i.test(userAgent.toLowerCase()))
  },
  iPhone(userAgent: string) {
    return (/iphone/i.test(userAgent.toLowerCase()))
  },
  iPad(userAgent: string) {
    return (/ipad/i.test(userAgent.toLowerCase()))
  },
  iPod(userAgent: string) {
    return (/ipod/i.test(userAgent.toLowerCase()))
  },
  Opera(userAgent: string) {
    return (/opera mini/i.test(userAgent.toLowerCase()))
  },
  Windows(userAgent: string) {
    return (/iemobile/i.test(userAgent.toLowerCase()))
  },
  Pad(userAgent: string) {
    return (/pad|m2105k81ac/i.test(userAgent.toLowerCase()))
  },
  mobile(userAgent: string) {
    if (userAgentTools.Pad(userAgent)) {
      return false
    }
    return (userAgentTools.Android(userAgent) || userAgentTools.iPhone(userAgent) || userAgentTools.BlackBerry(userAgent))
  },
}

/**
 * 获取用户 ip 地址
 */
export function getClientIP(req: Request) {
  let ip = req.headers['x-forwarded-for'] as string
    || req.ip
    || req.socket?.remoteAddress
    || ''
  if (ip.split(',').length > 0) {
    ip = ip.split(',')[0]
  }
  return ip.substring(ip.lastIndexOf(':') + 1)
}

/**
 * ip转为地址
 *
 * @async
 */
export async function ip2Address(ip: string) {
  try {
    // 是否为局域网
    const localIpRegex = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})$/
    if (localIpRegex.test(ip)) {
      return {
        ip,
        address: '局域网',
      }
    }
    // 通过互联网在线查询
    const { data }: { data: any } = await request({
      method: 'GET',
      url: 'http://ip.360.cn/IPShare/info',
      parmas: { ip },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/128.0.0.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'http://ip.360.cn/',
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
  }
  catch (e: any) {
    logger.error('IP地理位置查询失败', e)
  }
  return {
    ip,
    address: '未知',
  }
}

interface RequestReturnData {
  success: boolean
  status: number | null
  data: object | string | null
  headers: object | string | null
  error: string | null
  connected: boolean
}

/**
 * HTTP 请求
 *
 * @async
 */
export async function request(config: RequestConfig): Promise<RequestReturnData> {
  const returnData: RequestReturnData = {
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
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
        },
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      maxRedirects: Infinity,
      timeout: 60000,
      transformResponse: [
        (data: any) => {
          try {
            return JSON.parse(data)
          }
          catch {}
          try {
            // eslint-disable-next-line regexp/strict
            const jsonpRegex = /[\w$.]+\(\s*({[\s\S]*?})\s*\)\s*;?/
            if (jsonpRegex.test(data)) {
              const json = data.match(jsonpRegex)[1]
              return JSON.parse(json)
            }
          }
          catch {}
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
      .then((response) => {
        returnData.success = true
        returnData.status = response.status
        returnData.data = response.data
        returnData.headers = response.headers
        returnData.connected = true
      })
      .catch((error) => {
        let errorMessage: string | null
        if (error.response) {
          returnData.connected = true
          const statusCode = error.response?.status
          if (error.response.data) {
            returnData.data = error.response.data
          }
          if (error.response.headers) {
            returnData.headers = error.response.headers
          }
          const errorMessages = {
            301: '永久移动 [301 Moved Permanently]',
            302: '临时移动 [302 Found]',
            304: '资源未修改 [304 Not Modified]',
            307: '临时重定向 [307 Temporary Redirect]',
            308: '永久重定向 [308 Permanent Redirect]',
            400: '请求错误 [400 Bad Request]',
            401: '未授权 [401 Unauthorized]',
            403: '禁止访问 [403 Forbidden]',
            404: '资源未找到 [404 Not Found]',
            405: '方法不被允许 [405 Method Not Allowed]',
            406: '不可接受 [406 Not Acceptable]',
            408: '请求超时 [408 Request Timeout]',
            429: '请求过多 [429 Too Many Requests]',
            413: '请求实体过大 [413 Payload Too Large]',
            414: '请求的 URI 过长 [414 URI Too Long]',
            415: '不支持的媒体类型 [415 Unsupported Media Type]',
            416: '请求范围不符合要求 [416 Range Not Satisfiable]',
            493: '禁止访问 [493 Forbidden]',
            500: '服务器内部错误 [500 Internal Server Error]',
            501: '服务器不支持请求 [501 Not Implemented]',
            502: '网关错误 [502 Bad Gateway]',
            503: '服务不可用 [503 Service Unavailable]',
            504: '网关超时 [504 Gateway Timeout]',
            505: 'HTTP 版本不受支持 [505 HTTP Version Not Supported]',
          }
          errorMessage = errorMessages[statusCode] || `请求失败 [Response code ${statusCode}]`
        }
        else {
          if (error.request) {
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
              ERR_CONNECTION_TIMED_OUT: '连接超时',
              ERR_INTERNET_DISCONNECTED: '互联网连接已断开',
              ERR_SSL_PROTOCOL_ERROR: 'SSL 协议错误',
              ERR_ADDRESS_UNREACHABLE: '地址无法到达',
              ERR_BLOCKED_BY_CLIENT: '请求被客户端阻止',
              ERR_BLOCKED_BY_RESPONSE: '响应被阻止',
              ERR_CERT_COMMON_NAME_INVALID: '证书的通用名称无效',
              ERR_CERT_DATE_INVALID: '证书日期无效',
              ERR_CERT_AUTHORITY_INVALID: '证书颁发机构无效',
              ERR_CONTENT_LENGTH_MISMATCH: '内容长度不匹配',
              ERR_INSECURE_RESPONSE: '响应不安全',
              ERR_NAME_NOT_RESOLVED: '名称无法解析',
              ERR_NETWORK_CHANGED: '网络更改',
              ERR_NO_SUPPORTED_PROXIES: '没有支持的代理',
              ERR_PROXY_CONNECTION_FAILED: '代理连接失败',
              ERR_SSL_VERSION_OR_CIPHER_MISMATCH: 'SSL 版本或密码不匹配',
              ERR_TIMED_OUT: '操作超时',
              ERR_TOO_MANY_REDIRECTS: '重定向过多',
              ERR_UNSAFE_PORT: '不安全的端口',
              ERR_SSL_OBSOLETE_VERSION: 'SSL 版本过时',
              ERR_CERT_REVOKED: '证书已被吊销',
              ERR_CERT_TRANSPARENCY_REQUIRED: '需要证书透明度',
              ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN: '固定的 SSL 密钥不在证书链中',
              ERR_TUNNEL_CONNECTION_FAILED: '隧道连接失败',
            }
            errorMessage = `${errorMessages[error.code] ?? '未知网络错误'} [${error.code}]`
          }
          else {
            errorMessage = error.message || '未知错误状态'
          }
        }
        returnData.error = errorMessage
        returnData.status = error.response?.status || null
      })
  }
  catch (error: any) {
    returnData.error = error.message || error
  }
  return returnData
}
