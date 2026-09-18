enum ResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARN = 'warning',
}

const successCode = 1
const errorCode = 0

export default {
  ok(message: string = ResponseType.SUCCESS, result: boolean | string | object = true) {
    return {
      code: successCode,
      result,
      message,
      type: ResponseType.SUCCESS,
    }
  },
  okData(result: any) {
    return this.ok(ResponseType.SUCCESS, result)
  },
  fail(message: string | null, code = errorCode) {
    return {
      code,
      message,
      type: ResponseType.ERROR,
    }
  },
  failData(message: string = ResponseType.ERROR, result: any) {
    return {
      message,
      result,
      code: errorCode,
      type: ResponseType.ERROR,
    }
  },
  API: {
    NO_AUTH: { code: 401, message: 'Please Log In First' },
    AUTH_FAIL: { code: 403, message: 'Authentication Failed' },
    SYNTAX_ERROR: { code: 400, message: 'Bad Request' },
    INTERNAL_ERROR: { code: 500, message: 'Internal Server Error' },
  },
  OPEN_API: {
    NO_AUTH: { code: 4401, message: 'API Authorization Required' },
    AUTH_FAIL: { code: 4403, message: 'Authentication Failed' },
    PERMISSION_DENIED: { code: 4405, message: 'Permission Denied' },
    NOT_FOUND: { code: 4404, message: 'API Not Found' },
    SYNTAX_ERROR: { code: 4400, message: 'Bad Request' },
  },
}
