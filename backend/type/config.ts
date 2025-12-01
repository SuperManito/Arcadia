export interface IConfig {
  [key: string]: any
}

/**
 * 定义配置模块枚举
 */
export enum ModuleEnum {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  APP = 'APP',
}

/**
 * 配置类
 */
export interface ConfigItem {
  key: string
  module: ModuleEnum
  value: any
  name: string
  description: string
}

/**
 * 定义配置项目
 */
export const DEFAULT_CONFIGS = {
  USER: {
    username: {
      key: 'username',
      value: 'useradmin',
      name: '登录用户名',
      description: '登录用户名',
    },
    password: {
      key: 'password',
      value: 'passwd',
      name: '登录密码',
      description: '登录密码',
    },
  },
  SYSTEM: {
    openApiToken: {
      key: 'openApiToken',
      value: null,
      name: 'OpenApiToken',
      description: 'OpenApiToken',
    },
    jwtSecret: {
      key: 'jwtSecret',
      value: null,
      name: 'JWT授权密钥',
      description: 'JWT授权密钥',
    },
  },
}

export class ConfigBase implements IConfig {
  /**
   * 从配置项数组创建配置对象
   * @param configs 配置项数组
   * @returns 配置对象
   */
  public static fromConfigs<T extends ConfigBase>(this: new () => T, configs: ConfigItem[]): T {
    const instance = new this()
    configs.forEach(config => {
      (instance as any)[config.key] = config.value
    })
    return instance
  }

  /**
   * 将配置对象转换为配置项数组
   * @returns 配置项数组
   */
  public toConfigItems(module: ModuleEnum): ConfigItem[] {
    const items: ConfigItem[] = []
    Object.keys(this).forEach(prop => {
      const defaultConfig = DEFAULT_CONFIGS[module][prop]
      items.push({
        key: defaultConfig.key,
        module,
        name: defaultConfig.name,
        description: defaultConfig.description,
        value: this[prop],
      })
    })
    return items
  }

  [key: string]: any
}

export class UserConfig extends ConfigBase implements IConfig {
  /**
   * 用户名
   */
  public username: string = ''

  /**
   * 密码
   */
  public password: string = ''
}

export class SysConfig extends ConfigBase implements IConfig {
  /**
   * 开放接口令牌
   */
  public openApiToken: string = ''

  /**
   * JWT 密钥
   */
  public jwtSecret: string = ''
}

// 测试方法
// export function test() {
//   const username = { key: 'username', data: 'admin' }
//   const password = { key: 'password', data: 'password' }
//   const config = UserConfig.fromConfigs([username, password])
//   console.log(config)
// }
//
// test()
