/**
 * 格式化时间
 * @param fmt
 * @param date
 * @returns {*}
 */
function dateFormat(fmt, date) {
  let ret
  const opt = {
    'y+': date.getFullYear().toString(), // 年
    'M+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate().toString(), // 日
    'h+': date.getHours().toString(), // 时
    'm+': date.getMinutes().toString(), // 分
    's+': date.getSeconds().toString(), // 秒
    'S+': date.getMilliseconds().toString(), // 毫秒
    // 有其他格式化字符需求可以继续添加，必须转化成字符串
  }
  for (const k in opt) {
    ret = new RegExp(`(${k})`).exec(fmt)
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')))
    }
  }
  return fmt
}

function getDateStr(date) {
  return dateFormat('yyyy-MM-dd', date)
}

function dateToString(date) {
  return dateFormat('yyyy-MM-dd hh:mm:ss', date)
}

function dateToFileName(date) {
  return dateFormat('yyyy_MM_dd-hh_mm_ss.SSS', date)
}

// eslint-disable-next-line no-extend-native
Date.prototype.toJSON = function () {
  return dateToString(this)
}

function parseFileNameDate(fileName) {
  fileName = fileName.replace('.log', '')
  const array = fileName.split('-')
  return new Date(array[0], array[1] - 1, array[2], array[3], array[4], array[5])
}

function randomNumber(min = 0, max = 100) {
  return Math.min(Math.floor(min + Math.random() * (max - min)), max)
}

/**
 * 对象数组排序
 * @param array 需要排序的数组
 * @param field 字段
 * @param isAsc 是否升序
 * @returns {*[]}
 */
function arrayObjectSort(field, array = [], isAsc = true) {
  field && array.sort((a, b) => {
    return isAsc ? a[field] - b[field] : b[field] - a[field]
  })
  return array
}

function inArray(search, array) {
  for (const i in array) {
    if (array[i] === search) {
      return true
    }
  }
  return false
}

/**
 * 是否为空
 * @param str
 * @returns {boolean}
 */
function isNotEmpty(str) {
  return str !== null && undefined !== str && str !== ''
}

/**
 * 去空格
 */
function strTrim(str = '') {
  return str.trim()
}

/**
 * 正则匹配
 */
function regExecFirst(str = '', reg) {
  const exec = reg.exec(str)
  if (exec && exec.length > 0) {
    return strTrim(exec[0])
  }
  return ''
}

/**
 * 防抖
 */
function debounce(func, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * 节流
 */
function throttle(func, delay) {
  let timeout
  let immediate = true
  return function (...args) {
    if (immediate) {
      func.apply(this, args)
      immediate = false
    }
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null
        func.apply(this, args)
      }, delay)
    }
  }
}

function checkType(value, type) {
  if (type.endsWith('[]')) {
    if (!Array.isArray(value)) return false
    const itemType = type.slice(0, -2)
    // eslint-disable-next-line valid-typeof
    return value.every((item) => typeof item === itemType)
  } else {
    // eslint-disable-next-line valid-typeof
    return typeof value === type
  }
}

/**
 * 传参格式校验（拦截器）
 */
function validateParams(req, params) {
  params.forEach(([paramType, paramName, options = []]) => {
    const [required = false, type = 'string', allowEmptyString = false] = options
    const params = req[paramType]

    if (!Object.prototype.hasOwnProperty.call(params, paramName)) {
      if (required) {
        throw new Error(`缺少必要的参数 ${paramName}`)
      }
      return // 如果该参数不是必需的且不存在，则跳过其余检查
    }
    const paramValue = params[paramName]
    if (required) {
      if (paramType === 'query') {
        const value = params[paramName]
        if ((['undefined', 'None', null].includes(value) || (!allowEmptyString && value === ''))) {
          throw new Error(`参数 ${paramName} 无效（参数值不能为空）`)
        }
      } else if (paramType === 'body') {
        const value = params[paramName]
        if ((['undefined', 'None', null].includes(value) || Number.isNaN(value)) || (Array.isArray(value) && value.length === 0) || (!allowEmptyString && typeof value === 'string' && value === '')) {
          throw new Error(`参数 ${paramName} 无效（参数值不能为空）`)
        }
      }
    }
    if (Array.isArray(type)) {
      if (!type.includes(paramValue)) {
        throw new Error(`参数 ${paramName} 无效（参数值类型错误）`)
      }
    } else if (type.includes('|')) {
      const types = type.replace(/\s/g, '').split('|')
      if (!types.some((t) => checkType(paramValue, t))) {
        throw new Error(`参数 ${paramName} 无效（参数值类型错误）`)
      }
    } else if (!checkType(paramValue, type)) {
      throw new Error(`参数 ${paramName} 无效（参数值类型错误）`)
    }
  })
}

/**
 * 校验分页接口常用参数
 */
function validatePageParams(req, orderByFields) {
  validateParams(req, [
    ['query', 'page', [false, 'string']],
    ['query', 'size', [false, 'string']],
    ['query', 'order', [false, ['1', '0']]],
    ['query', 'orderBy', [false, orderByFields ?? 'string']],
  ])
  for (const param of ['page', 'size']) {
    const keyValue = req.query[param]
    if (!keyValue) {
      continue
    }
    if (!/^\d+$/.test(keyValue) || parseInt(keyValue) <= 0) {
      throw new Error(`参数 ${param} 无效（参数值类型错误）`)
    }
  }
}

/**
 * 对象格式校验（拦截器）
 */
function validateObject(obj, params, objName = '') {
  if (objName) {
    objName = ` ${objName} `
  }
  params.forEach(([paramName, options = []]) => {
    const [required = false, type = 'string'] = options

    if (!Object.prototype.hasOwnProperty.call(obj, paramName)) {
      if (required) {
        throw new Error(`源对象${objName}中缺少必要的属性 ${paramName}`)
      }
      return // 如果该参数不是必需的且不存在，则跳过其余检查
    }
    const paramValue = obj[paramName]
    if (required) {
      if ((['undefined', 'None', null].includes(paramValue) || Number.isNaN(paramValue)) || (Array.isArray(paramValue) && paramValue.length === 0) || (typeof paramValue === 'string' && paramValue === '')) {
        throw new Error(`源对象${objName}中的属性 ${paramName} 无效（属性值不能为空）`)
      }
    }
    if (Array.isArray(type)) {
      if (!type.includes(paramValue)) {
        throw new Error(`源对象${objName}中的属性 ${paramName} 无效（属性值类型错误）`)
      }
    } else if (type.includes('|')) {
      const types = type.replace(/\s/g, '').split('|')
      if (!types.some((t) => checkType(paramValue, t))) {
        throw new Error(`源对象${objName}中的属性 ${paramName} 无效（属性值类型错误）`)
      }
    } else if (!checkType(paramValue, type)) {
      throw new Error(`源对象${objName}中的属性 ${paramName} 无效（属性值类型错误）`)
    }
  })
}

function cleanProperties(obj, fields) {
  if (!obj) return obj
  const originalObject = obj
  obj = Object.keys(obj)
    .filter((key) => {
      return fields.includes(key)
    })
    .reduce((obj, key) => {
      obj[key] = originalObject[key]
      return obj
    }, {})
  return obj
}

module.exports = {
  validateParams,
  validatePageParams,
  validateObject,
  cleanProperties,
  dateToString,
  dateToFileName,
  getDateStr,
  dateFormat,
  parseFileNameDate,
  randomNumber,
  arrayObjectSort,
  inArray,
  isNotEmpty,
  strTrim,
  regExecFirst,
  debounce,
  throttle,
}
