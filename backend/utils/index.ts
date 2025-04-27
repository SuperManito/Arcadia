import type { Request } from 'express'

/**
 * 格式化时间
 */
export function dateFormat(fmt: string, date: Date) {
  let ret: RegExpExecArray | null
  const opt = {
    'y+': date.getFullYear().toString(), // 年
    'M+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate().toString(), // 日
    'h+': date.getHours().toString(), // 时
    'm+': date.getMinutes().toString(), // 分
    's+': date.getSeconds().toString(), // 秒
    'S+': date.getMilliseconds().toString(), // 毫秒
  }
  for (const k in opt) {
    ret = new RegExp(`(${k})`).exec(fmt)
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')))
    }
  }
  return fmt
}

export function getDateStr(date: Date) {
  return dateFormat('yyyy-MM-dd', date)
}

export function dateToString(date: Date) {
  return dateFormat('yyyy-MM-dd hh:mm:ss', date)
}

export function dateToFileName(date: Date) {
  return dateFormat('yyyy_MM_dd-hh_mm_ss.SSS', date)
}

// eslint-disable-next-line no-extend-native
Date.prototype.toJSON = function () {
  return dateToString(this)
}

export function parseFileNameDate(fileName: string) {
  fileName = fileName.replace('.log', '')
  const array = fileName.split('-') as unknown as number[]
  return new Date(array[0], array[1] - 1, array[2], array[3], array[4], array[5])
}

export function randomNumber(min = 0, max = 100) {
  return Math.min(Math.floor(min + Math.random() * (max - min)), max)
}

/**
 * 对象数组排序
 *
 * @param array 需要排序的数组
 * @param field 字段
 * @param isAsc 是否升序
 * @returns {*[]}
 */
export function arrayObjectSort(field: string, array: any[] = [], isAsc: boolean = true): any[] {
  field && array.sort((a, b) => {
    return isAsc ? a[field] - b[field] : b[field] - a[field]
  })
  return array
}

/**
 * 是否非空
 *
 * @param str
 * @returns {boolean}
 */
export function isNotEmpty(str: any): boolean {
  return str !== null && undefined !== str && str !== ''
}

/**
 * 正则匹配
 */
export function regExecFirst(str = '', reg: RegExp) {
  const exec = reg.exec(str)
  if (exec && exec.length > 0) {
    return exec[0].trim()
  }
  return ''
}

/**
 * 防抖
 * @param func 需要防抖的函数
 * @param wait 等待时间(ms)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>): void {
    if (timeout)
      clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * 节流
 * @param func 需要节流的函数
 * @param delay 延迟时间(ms)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let immediate = true

  return function (this: any, ...args: Parameters<T>): void {
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

export function checkType(value: any, type: string) {
  if (type.endsWith('[]')) {
    if (!Array.isArray(value))
      return false
    const itemType = type.slice(0, -2)
    // eslint-disable-next-line valid-typeof
    return value.every((item) => typeof item === itemType)
  }
  else {
    // eslint-disable-next-line valid-typeof
    return typeof value === type
  }
}

/**
 * 传参格式校验（拦截器）
 */
export type ValidateParamsParamType = [paramType: 'query' | 'body', paramName: string, options?: [required: boolean, type: string | Array<string | number>, allowEmptyString?: boolean]]

export function validateParams(req: Request, params: ValidateParamsParamType[]) {
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
      }
      else if (paramType === 'body') {
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
    }
    else if (type.includes('|')) {
      const types = type.replace(/\s/g, '').split('|')
      if (!types.some((t) => checkType(paramValue, t))) {
        throw new Error(`参数 ${paramName} 无效（参数值类型错误）`)
      }
    }
    else if (!checkType(paramValue, type)) {
      throw new Error(`参数 ${paramName} 无效（参数值类型错误）`)
    }
  })
}

/**
 * 校验分页接口常用参数
 */
export function validatePageParams(req: Request, orderByFields?: (string | number)[]) {
  validateParams(req, [
    ['query', 'search', [false, 'string', true]],
    ['query', 'page', [false, 'string']],
    ['query', 'size', [false, 'string']],
    ['query', 'order', [false, ['1', '0']]],
    ['query', 'orderBy', [false, orderByFields ?? 'string']],
  ])
  for (const param of ['page', 'size']) {
    const keyValue = req.query[param] as string
    if (!keyValue) {
      continue
    }
    if (!/^\d+$/.test(keyValue) || Number.parseInt(keyValue) <= 0) {
      throw new Error(`参数 ${param} 无效（参数值类型错误）`)
    }
  }
}

/**
 * 对象格式校验（拦截器）
 */
export type ValidateObjectParamType = [paramName: string, options?: [required: boolean, type: string | Array<string | number>]]

export function validateObject(obj: object, params: ValidateObjectParamType[], objName: string = '') {
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
    }
    else if (type.includes('|')) {
      const types = type.replace(/\s/g, '').split('|')
      if (!types.some((t) => checkType(paramValue, t))) {
        throw new Error(`源对象${objName}中的属性 ${paramName} 无效（属性值类型错误）`)
      }
    }
    else if (!checkType(paramValue, type)) {
      throw new Error(`源对象${objName}中的属性 ${paramName} 无效（属性值类型错误）`)
    }
  })
}

/**
 * 去除对象中的非指定属性
 */
export function cleanProperties<T extends object>(obj: T, fields: string[]): T {
  if (!obj)
    return obj
  const originalObject = obj
  return Object.keys(obj)
    .filter((key) => {
      return fields.includes(key)
    })
    .reduce((acc, key) => {
      acc[key] = originalObject[key]
      return acc
    }, {} as T)
}

export function randomString(length?: number, options?: {
  specials?: string | boolean
  numbers?: string | boolean
  letters?: string | boolean
} | string | true) {
  const numbers = '0123456789'
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const specials = '~!@#$%^*()_+-=[]{}|;:,./<>?'

  length || (length = 8)
  options || (options = {})

  let chars = ''
  let result = ''

  if (options === true) {
    chars = numbers + letters + specials
  }
  else if (typeof options == 'string') {
    chars = options
  }
  else {
    if (options.numbers !== false) {
      chars += (typeof options.numbers == 'string') ? options.numbers : numbers
    }

    if (options.letters !== false) {
      chars += (typeof options.letters == 'string') ? options.letters : letters
    }

    if (options.specials) {
      chars += (typeof options.specials == 'string') ? options.specials : specials
    }
  }

  while (length > 0) {
    length--
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
