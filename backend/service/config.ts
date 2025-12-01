import { PrismaClient } from '@prisma/client'
import type { ConfigBase, ConfigItem } from '../type/config'
import { DEFAULT_CONFIGS, ModuleEnum, SysConfig, UserConfig } from '../type/config'
import { isNotEmpty, randomString } from '../utils'

const prisma = new PrismaClient()

/**
 * 配置服务类，提供配置相关的各种操作方法
 */
class ConfigService {
  /**
   * 根据module查询配置列表
   * @param module 模块名
   * @returns 配置列表
   */
  static async getConfigsByModule(module: string): Promise<any[]> {
    try {
      return await prisma.config.findMany({
        where: { module },
        orderBy: {
          id: 'asc',
        },
      })
    }
    catch (error) {
      console.error(`Error fetching configs for module ${module}:`, error)
      throw error
    }
  }

  /**
   * 根据module查询配置并转换为指定类型
   * @param module 模块名
   * @param converter 转换函数
   * @returns 转换后的对象
   */
  static async getConfigsByModuleAs<T>(
    module: string,
    converter: (configs: any[]) => T,
  ): Promise<T> {
    try {
      const configs = await this.getConfigsByModule(module)
      return converter(configs)
    }
    catch (error) {
      console.error(`Error fetching configs for module ${module} as custom type:`, error)
      throw error
    }
  }

  static async getConfigsByModuleAsClass<T extends ConfigBase>(
    module: string,
    ConfigClass: new () => T,
  ): Promise<T> {
    try {
      const configs = await this.getConfigsByModule(module)
      if (typeof (ConfigClass as any).fromConfigs === 'function') {
        return (ConfigClass as any).fromConfigs(configs)
      }
      else {
        throw new TypeError('Provided class must have a static fromConfigs method')
      }
    }
    catch (error) {
      console.error(`Error fetching configs for module ${module} as class:`, error)
      throw error
    }
  }

  /**
   * 更新单个配置
   * @param key 配置键
   * @param value 配置数据
   * @returns 更新后的配置
   */
  static async updateConfig(key: string, value: any): Promise<any> {
    try {
      // 先检查配置是否存在
      const existingConfig = await prisma.config.findFirst({
        where: { key },
      })

      if (!existingConfig) {
        throw new Error(`Config with key ${key} not found`)
      }

      // 更新配置
      return await prisma.config.update({
        where: { key },
        data: {
          value,
        },
      })
    }
    catch (error) {
      console.error(`Error updating config with key ${key}:`, error)
      throw error
    }
  }

  /**
   * 批量更新配置
   * @param updates 配置更新数组
   * @returns 更新结果
   */
  static async batchUpdateConfigs(updates: ConfigItem[]): Promise<any[]> {
    try {
      const results: any[] = []
      for (const update of updates) {
        const result = await this.updateConfig(update.key, update.value)
        results.push(result)
      }
      return results
    }
    catch (error) {
      console.error('Error batch updating configs:', error)
      throw error
    }
  }

  /**
   * 根据配置对象更新配置
   * @param config 配置对象
   * @returns 更新后的配置
   */
  static async updateConfigByObject(config: any): Promise<any> {
    try {
      return await this.updateConfig(config.key, config.value)
    }
    catch (error) {
      console.error('Error updating config by object:', error)
      throw error
    }
  }

  /**
   * 根据key和module获取配置值
   * @param key 配置键
   * @param module 模块名
   * @returns 配置值
   */
  static async getConfigValueByKeyAndModule(key: string, module: string): Promise<string> {
    try {
      const config = await prisma.config.findFirst({
        where: {
          key,
          module,
        },
      })

      if (!config) {
        throw new Error(`Config with key ${key} and module ${module} not found`)
      }

      return config.value
    }
    catch (error) {
      console.error(`Error fetching config value for key ${key} and module ${module}:`, error)
      throw error
    }
  }

  /**
   * 系统配置初始化
   * @returns 初始化结果
   */
  static async initializeUserConfigs(): Promise<any> {
    try {
      const userConfig = await this.getConfigsByModuleAsClass(ModuleEnum.USER, UserConfig)
      if (!isNotEmpty(userConfig.username)) {
        userConfig.username = DEFAULT_CONFIGS.USER.username.value
        userConfig.password = DEFAULT_CONFIGS.USER.password.value
        await this.saveConfigObject(userConfig, ModuleEnum.USER)
      }

      return userConfig
    }
    catch (error) {
      console.error('Error initializing user configs:', error)
      throw error
    }
  }

  /**
   * 系统配置初始化
   * @returns 初始化结果
   */
  static async initializeSystemConfigs(): Promise<any> {
    try {
      const systemConfig = await this.getConfigsByModuleAsClass(ModuleEnum.SYSTEM, SysConfig)
      let change = false
      if (!isNotEmpty(systemConfig.openApiToken)) {
        systemConfig.openApiToken = randomString(32)
        change = true
      }
      if (!isNotEmpty(systemConfig.jwtSecret)) {
        systemConfig.jwtSecret = randomString(16)
        change = true
      }
      if (change) {
        await this.saveConfigObject(systemConfig, ModuleEnum.SYSTEM)
      }

      return systemConfig
    }
    catch (error) {
      console.error('Error initializing system configs:', error)
      throw error
    }
  }

  /**
   * 保存继承自ConfigBase类的配置对象
   * @param config 继承自ConfigBase的配置对象
   * @param module 模块名
   * @returns 保存结果
   */
  static async saveConfigObject(config: ConfigBase, module: ModuleEnum): Promise<any[]> {
    try {
      // 将配置对象转换为配置项数组
      const configItems: ConfigItem[] = config.toConfigItems(module)

      const results: any[] = []
      for (const item of configItems) {
        const key = item.key
        const existingConfig = await prisma.config.findFirst({
          where: {
            key,
            module,
          },
        })

        const configData = {
          key,
          module,
          name: item.name,
          value: typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value),
          description: item.description,
        }

        if (existingConfig) {
          // 更新现有配置
          const updatedConfig = await prisma.config.update({
            where: { id: existingConfig.id },
            data: configData,
          })
          results.push(updatedConfig)
        }
        else {
          // 创建新配置
          const newConfig = await prisma.config.create({
            data: configData,
          })
          results.push(newConfig)
        }
      }

      return results
    }
    catch (error) {
      console.error('Error saving config object:', error)
      throw error
    }
  }
}

export default ConfigService
