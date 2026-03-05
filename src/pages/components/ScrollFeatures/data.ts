export interface ScrollFeatureItem {
  title: string
  description: string
  imgUrlDark: string
  imgUrlLight: string
  badge: string
}

export const scrollFeatures: ScrollFeatureItem[] = [
  {
    title: '定时任务数据监控可视化',
    description: '多维监控仪表盘实时呈现任务运行状态与历史趋势，可快速定位异常与优化调度策略。运行趋势可查看数天内的任务执行情况。',
    imgUrlDark: '/images/feature/scroll-feature-1-dark.png',
    imgUrlLight: '/images/feature/scroll-feature-1-light.png',
    badge: 'Task Visualization',
  },
  {
    title: '灵活的脚本订阅与仓库同步',
    description: '代码同步功能支持通过 Git 仓库地址一键拉取脚本，可精细配置拉取分支、私有认证、定时任务过滤等参数；同时支持以原始链接直接订阅远程单文件。告别手动上传，让脚本内容始终与上游保持同步。',
    imgUrlDark: '/images/feature/scroll-feature-2-dark.png',
    imgUrlLight: '/images/feature/scroll-feature-2-light.png',
    badge: 'Auto Code Sync',
  },
  {
    title: '强大的运行日志检索',
    description: '日志组件支持内容高亮、实时滚动追踪、按照日期范围过滤。高级模式下还可开启反转输出与自动轮询刷新，无论是快速排查异常还是持续观察在线任务，都能以最直观的方式呈现所需信息。',
    imgUrlDark: '/images/feature/scroll-feature-3-dark.png',
    imgUrlLight: '/images/feature/scroll-feature-3-light.png',
    badge: 'Log Viewer',
  },
  {
    title: '视窗级文件管理',
    description: '文件管理页面以仿桌面的交互体验呈现，平铺与列表视图自由切换，除文件基础操作外还支持多选、拖拽移动等功能。',
    imgUrlDark: '/images/feature/scroll-feature-4-dark.png',
    imgUrlLight: '/images/feature/scroll-feature-4-light.png',
    badge: 'File Management',
  },
]
