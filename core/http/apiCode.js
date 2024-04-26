// type: 'success' | 'error' | 'warning';
const successCode = 1
const errorCode = 0
const API_STATUS_CODE = {
  ok(message = 'success', result) {
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
  failData(message = '系统错误', result) {
    return {
      message,
      result,
      code: errorCode,
      type: 'error',
    }
  },
  API: {
    NEED_LOGIN: {
      code: 403,
      message: '请先登录!',
    },
    NO_PERMISSION: {
      code: 401,
      message: '无权限访问!',
    },
    SYNTAX_ERROR: {
      code: 400,
      message: '请求错误!',
    },
  },
  OPEN_API: {
    AUTH_FAIL: {
      code: 4403,
      type: '认证失败!',
    },
    NOT_OPEN: {
      code: 4406,
      type: '调用失败',
      message: '未设置开放接口密钥，不允许访问',
    },
  },
}

module.exports = {
  API_STATUS_CODE,
}
