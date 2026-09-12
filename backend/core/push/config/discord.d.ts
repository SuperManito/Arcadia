export interface DiscordConfig {
  webhookUrl: string
  /** 机器人名称 */
  username?: string
  /** 发送目标 */
  channelType?: 'channel' | 'createNewForumPost' | 'postToThread'
  /** 论坛帖标题 */
  postName?: string
  /** 线程 ID */
  threadId?: string
  /** 抑制通知 */
  suppressNotifications?: boolean
}
