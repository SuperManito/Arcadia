// type: 'success' | 'error' | 'warning';
const successCode = 1
const errorCode = 0
const API_STATUS_CODE = {
  ok(message = 'success', result = true) {
    return {
      code: successCode,
      result,
      message,
      type: 'success',
    }
  },
  okData(result) {
    return this.ok('success', result)
  },
  fail(message, code = errorCode) {
    return {
      code,
      message,
      type: 'error',
    }
  },
  failData(message = 'error', result) {
    return {
      message,
      result,
      code: errorCode,
      type: 'error',
    }
  },
  API: {
    NO_AUTH: {
      code: 401,
      message: '请先登录',
    },
    AUTH_FAIL: {
      code: 403,
      message: '认证失败',
    },
    SYNTAX_ERROR: {
      code: 400,
      message: '请求错误',
    },
  },
  OPEN_API: {
    NO_AUTH: {
      code: 4401,
      message: '请提供令牌',
    },
    AUTH_FAIL: {
      code: 4403,
      type: '认证失败',
    },
    SYNTAX_ERROR: {
      code: 4400,
      message: '请求错误',
    },
  },
}

module.exports = {
  API_STATUS_CODE,
}
