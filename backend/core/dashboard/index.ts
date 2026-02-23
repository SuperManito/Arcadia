import { initTaskMonitor } from './task'

/**
 * 初始化监控系统
 */
export async function initDashboardMonitor() {
  await initTaskMonitor()
}
