import fs from 'node:fs'
import { logger } from '../../utils/logger'
import { sendTextMessage } from '.'
import { sleep, throttle } from '../../utils'

/**
 * 监听来自shell脚本的消息
 * 对应shell脚本: shell/notify/send.sh
 */
export class MessageListener {
  private watcher: fs.FSWatcher | null
  private lastId = 0
  private currentId = 0
  private processing = false

  constructor(private readonly workDir: string, private readonly extInfo: any) {
    this.watcher = null

    fs.mkdirSync(this.workDir, { recursive: true })
    if (!fs.existsSync(`${this.workDir}/index`)) {
      fs.writeFileSync(`${this.workDir}/index`, '0')
    }

    this.watcher = fs.watch(`${this.workDir}/index`, throttle(() => {
      fs.readFile(`${this.workDir}/index`, 'utf8', (err, data) => {
        if (err) {
          logger.error('读取文件失败:', err)
          return
        }
        this.currentId = Number.parseInt(data)
        // 不阻塞执行
        this.processMessages()
      })
      // 一段时间只更新一次id,避免高频更新
    }, 100))
  }

  public async stopListening() {
    if (this.watcher) {
      // 等一段时间,确定所有消息处理完毕,不然可能有消息丢失
      await sleep(500)
      if (this.processing) {
        await this.stopListening()
        return
      }
      this.watcher.close()
      this.watcher = null
      logger.debug('已停止监听消息')
      // 删除工作目录
      fs.rmSync(this.workDir, { recursive: true, force: true })
    }
  }

  /**
   * 处理消息
   * @param nowId 当前最新的消息ID
   */
  private async processMessages() {
    // 如果正在处理中，则直接返回，等待下次处理
    if (this.processing) {
      return
    }

    this.processing = true

    try {
      for (let i = this.lastId + 1; i <= this.currentId; i++) {
        await this.processMessageFile(i)
        this.lastId = i
      }
    }
    finally {
      this.processing = false
    }
  }

  /**
   * 处理单个消息文件
   * @param messageId 消息ID
   */
  private async processMessageFile(messageId: number) {
    const file = `${this.workDir}/${messageId}`
    try {
      // 读取消息内容
      const content = fs.readFileSync(file, 'utf8').trim()

      // 解析消息类型和内容
      const delimiterIndex = content.indexOf('=')
      if (delimiterIndex === -1) {
        logger.warn(`消息格式错误 (#${messageId}): `, content)
        return
      }
      const type = content.substring(0, delimiterIndex)
      const message = content.substring(delimiterIndex + 1)

      // 根据类型处理消息
      switch (type) {
        case 'message':
          await sendTextMessage(message, this.extInfo)
          break
        default:
          // 默认作为普通消息处理
          logger.error('收到未知类型的消息，请检查shell脚本:', messageId, type, message)
      }

      // 删除已处理的消息文件
      fs.rmSync(file, { force: true })
      logger.debug(`已处理消息 #${messageId}: ${type} = ${message}`)
    }
    catch (e: any) {
      logger.warn(`处理消息文件失败 (#${messageId}): `, e.message || e)
    }
  }
}
